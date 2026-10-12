import {
  generateBriefDrivenScript,
  type BriefDrivenWriterProviderRequest,
  type BriefDrivenWriterProviderResponse,
  type BriefDrivenWriterAttemptCapture,
} from "../../brief-driven-script-writer";
import type { ScriptWriterInput } from "../../brief-driven-script";
import { callProvider, DEFAULT_PROVIDER, getProviderStatuses, type ProviderResponse } from "../../provider-router";
import type { ProviderId } from "../../provider-types";
import { persistQualityTracePatch, validQualityTraceId } from "../../quality-trace";

export const runtime = "nodejs";
export const maxDuration = 120;

export function resolveScriptWriterProvider(
  requested: ProviderId,
  environment = process.env.VERCEL_ENV,
  previewOverride = process.env.SCRIPT_WRITER_PROVIDER,
  previewCreativeProvider = process.env.CREATIVE_BRAIN_PROVIDER,
): ProviderId {
  if (environment !== "preview") return requested;
  const value = previewOverride?.trim() || previewCreativeProvider?.trim();
  return value === "deepseek" || value === "doubao" || value === "openai" ? value : requested;
}

export async function GET() {
  return Response.json({ acceptanceHarnessEnabled: process.env.VERCEL_ENV === "preview" });
}

function requestShape(value: unknown): value is ScriptWriterInput & { provider?: ProviderId } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<ScriptWriterInput>;
  return Boolean(item.projectId && item.requestId && item.creativeBriefReference && item.creativeBrief && item.productContext);
}

function safeMessage(type: string | null) {
  if (type === "provider_http_error") return "脚本模型连接中断或服务请求失败，本次未获得可用脚本。请检查网络连接。";
  if (type === "timeout") return "脚本生成超时，请重试。";
  if (type === "invalid_input") return "Brief-driven Script Writer input is invalid.";
  if (type === "repair_failed" || type === "validation_failed") return "脚本草稿未通过结构或安全校验。";
  return "脚本生成失败，请重试。";
}

function failureStatus(type: string | null) {
  if (type === "invalid_input") return 400;
  if (type === "timeout") return 504;
  if (type === "repair_failed" || type === "validation_failed" || type === "invalid_output") return 422;
  return 502;
}

function localFailureDetails(request:Request, attempts:BriefDrivenWriterAttemptCapture[]) {
  if(!["localhost","127.0.0.1","[::1]"].includes(new URL(request.url).hostname))return "";
  const last=attempts.at(-1);
  if(!last?.parsedDraft)return "";
  const labels:Record<string,string>={unsupported_product_truth:"产品事实校验",unsupported_gift_or_delivery:"赠品或配送承诺未经支持",unsupported_product_capability:"产品能力未经支持",unsupported_promotion:"促销承诺未经支持",duration_mismatch:"总时长不符合要求",scene_duration_mismatch:"镜头时长合计不符合要求"};
  return last.validation.slice(0,4).map(item=>{
    let value:unknown=last.parsedDraft;
    for(const key of (item.path||"").split(".")){value=value&&typeof value==="object"?(value as Record<string,unknown>)[key]:undefined;}
    const excerpt=typeof value==="string"?`：${value.slice(0,300)}`:typeof value==="number"?`：${value} 秒`:"";
    return `${labels[item.ruleCode||item.code]||labels[item.code]||"脚本校验未通过"}（${item.path||"草稿"}）${excerpt}`;
  }).join("；");
}

export async function POST(request: Request) {
  const correlationId = globalThis.crypto.randomUUID();
  let body: ScriptWriterInput & { provider?: ProviderId };
  try {
    const parsed: unknown = await request.json();
    if (!requestShape(parsed)) return Response.json({ status: "failure", script: null, issues: [], error: { type: "invalid_input", message: safeMessage("invalid_input") } }, { status: 400 });
    body = parsed;
  } catch {
    return Response.json({ status: "failure", script: null, issues: [], error: { type: "invalid_input", message: safeMessage("invalid_input") } }, { status: 400 });
  }

  const requested = body.provider || DEFAULT_PROVIDER;
  const statuses = getProviderStatuses();
  if (typeof requested !== "string" || !(requested in statuses)) return Response.json({ status: "failure", script: null, issues: [], error: { type: "invalid_provider", message: "Script Writer provider is unavailable." } }, { status: 400 });
  const providerUsed = resolveScriptWriterProvider(requested);
  if (!(providerUsed in statuses)) return Response.json({ status: "failure", script: null, issues: [], error: { type: "invalid_provider", message: "Script Writer provider is unavailable." } }, { status: 400 });
  const providerStatus = statuses[providerUsed];

  const adapter = async (input: BriefDrivenWriterProviderRequest): Promise<BriefDrivenWriterProviderResponse> => {
    const response: ProviderResponse = await callProvider({ ...input, provider: providerUsed, purpose: "script-writer", candidateCount: 1 });
    return { ...response, providerRequested: requested, providerUsed, model: providerStatus.model };
  };

  try {
    const attempts: BriefDrivenWriterAttemptCapture[] = [];
    const result = await generateBriefDrivenScript(body, adapter, {
      correlationId,
      providerIdentity: { providerRequested: requested, providerUsed, model: providerStatus.model },
      observe: ({ issues, ...event }) => console.warn(JSON.stringify({ event: "brief_driven_script_writer", ...event, validationAttempt: Math.max(0, event.attempt - 1), ...(issues ? { issues: issues.map(({ code, path, stage, validator, ruleFamily, ruleCode }) => ({ code, ...(path ? { path } : {}), stage, validator, ...(ruleFamily ? { ruleFamily } : {}), ...(ruleCode ? { ruleCode } : {}) })) } : {}) })),
      captureAttempt: capture => attempts.push(capture),
    });
    if (validQualityTraceId(body.qualityTraceId)) await persistQualityTracePatch({
      qualityTraceId: body.qualityTraceId,
      identity: { projectId: body.projectId, sourceBriefId: body.creativeBriefReference.id, sourceBriefRevisionId: body.creativeBriefReference.revisionId, productContextFingerprint: body.productContextFingerprint, market: body.market, platform: body.platform, workspaceLanguage: body.languageContext?.workspaceLanguage || body.workspaceLanguage, targetLanguage: body.languageContext?.targetLanguage || body.targetLanguage },
      creativeDirection: body.qualityTraceContext?.selectedCreativeDirection ? { selected: body.qualityTraceContext.selectedCreativeDirection } : "NOT_EXECUTED",
      creativeBrief: { input: body.qualityTraceContext?.selectedCreativeDirection || "NOT_EXECUTED", output: body.creativeBrief },
      productContext: { fingerprint: body.productContextFingerprint, snapshot: body.productContext },
      writer: { attempt0: attempts[0] || "NOT_EXECUTED", attempt1: attempts[1] || "NOT_EXECUTED", acceptedDraft: result.status === "success" ? result.draft : "NOT_EXECUTED" },
    });
    const traced = validQualityTraceId(body.qualityTraceId) ? { qualityTraceId: body.qualityTraceId } : {};
    if (result.status === "failure") return Response.json({ ...result, ...traced, error: { type: result.metadata.errorType, message: localFailureDetails(request,attempts)||safeMessage(result.metadata.errorType) } }, { status: failureStatus(result.metadata.errorType) });
    return Response.json({ ...result, ...traced }, { status: 201 });
  } catch {
    return Response.json({ status: "failure", script: null, issues: [], error: { type: "runtime_failure", message: "脚本生成失败，请重试。" } }, { status: 500 });
  }
}
