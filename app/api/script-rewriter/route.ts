import { generateTargetedScriptRewrite, type TargetedRewriteInput, type TargetedRewriteProviderRequest, type TargetedRewriteProviderResponse } from "../../brief-driven-script-rewriter";
import { callProvider, DEFAULT_PROVIDER, getProviderStatuses, type ProviderResponse } from "../../provider-router";
import type { ProviderId } from "../../provider-types";
import { persistQualityTracePatch, validQualityTraceId } from "../../quality-trace";

export const runtime = "nodejs";
export const maxDuration = 120;

export function resolveScriptRewriterProvider(
  requested: ProviderId,
  environment = process.env.VERCEL_ENV,
  previewOverride = process.env.SCRIPT_REWRITER_PROVIDER,
  previewCreativeProvider = process.env.CREATIVE_BRAIN_PROVIDER,
): ProviderId {
  if (environment !== "preview") return requested;
  const value = previewOverride?.trim() || previewCreativeProvider?.trim();
  return value === "deepseek" || value === "doubao" || value === "openai" ? value : requested;
}

function requestShape(value: unknown): value is TargetedRewriteInput & { provider?: ProviderId } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<TargetedRewriteInput>;
  return Boolean(item.requestId && item.projectId && item.sourceScriptRevisionId && item.creativeBriefReference && item.creativeBrief && item.productContext && item.currentDraft && item.languageContext && Array.isArray(item.issues));
}

function status(type: string | null) {
  if (type === "invalid_input" || type === "stale_source") return 409;
  if (type === "timeout") return 504;
  if (type === "invalid_output" || type === "validation_failed") return 422;
  return 502;
}

function message(type: string | null) {
  if (type === "stale_source") return "脚本已变化，请重新评审后再局部改写。";
  if (type === "invalid_input") return "Targeted Script Rewrite input is invalid.";
  if (type === "timeout") return "脚本局部改写超时，请重试。";
  if (type === "invalid_output" || type === "validation_failed") return "脚本局部改写未通过结构或安全校验。";
  return "脚本局部改写失败，请重试。";
}

export async function POST(request: Request) {
  let body: TargetedRewriteInput & { provider?: ProviderId };
  try {
    const parsed: unknown = await request.json();
    if (!requestShape(parsed)) return Response.json({ status: "failure", draft: null, script: null, issues: [], error: { type: "invalid_input", message: message("invalid_input") } }, { status: 400 });
    body = parsed;
  } catch {
    return Response.json({ status: "failure", draft: null, script: null, issues: [], error: { type: "invalid_input", message: message("invalid_input") } }, { status: 400 });
  }
  const requested = body.provider || DEFAULT_PROVIDER;
  const statuses = getProviderStatuses();
  if (!(requested in statuses)) return Response.json({ status: "failure", draft: null, script: null, issues: [], error: { type: "invalid_provider", message: "Script Rewriter provider is unavailable." } }, { status: 400 });
  const providerUsed = resolveScriptRewriterProvider(requested);
  if (!(providerUsed in statuses)) return Response.json({ status: "failure", draft: null, script: null, issues: [], error: { type: "invalid_provider", message: "Script Rewriter provider is unavailable." } }, { status: 400 });
  const providerStatus = statuses[providerUsed];
  const provider = async (input: TargetedRewriteProviderRequest): Promise<TargetedRewriteProviderResponse> => {
    const response: ProviderResponse = await callProvider({ ...input, provider: providerUsed, purpose: "script-rewriter", candidateCount: body.issues.length });
    return { ...response, providerRequested: requested, providerUsed, model: providerStatus.model };
  };
  try {
    const result = await generateTargetedScriptRewrite(body, provider, { providerIdentity: { providerRequested: requested, providerUsed, model: providerStatus.model } });
    if (validQualityTraceId(body.qualityTraceId)) await persistQualityTracePatch({ qualityTraceId: body.qualityTraceId, rewrite: { input: body, output: result } });
    if (result.status === "failure") {
      console.warn(JSON.stringify({
        event: "targeted_script_rewrite",
        correlationId: body.requestId,
        stage: result.issues[0]?.stage || "provider",
        provider: result.metadata.providerUsed,
        model: result.metadata.model,
        providerCalls: result.metadata.providerCalls,
        issueCount: result.issues.length,
        issues: result.issues.map(({ code, path, stage, validator, ruleFamily, ruleCode }) => ({ code, ...(path ? { path } : {}), stage, validator, ...(ruleFamily ? { ruleFamily } : {}), ...(ruleCode ? { ruleCode } : {}) })),
        errorType: result.metadata.errorType,
      }));
      return Response.json({ ...result, error: { type: result.metadata.errorType, message: message(result.metadata.errorType) } }, { status: status(result.metadata.errorType) });
    }
    return Response.json(result, { status: 201 });
  } catch {
    return Response.json({ status: "failure", draft: null, script: null, issues: [], error: { type: "runtime_failure", message: "脚本局部改写失败，请重试。" } }, { status: 500 });
  }
}
