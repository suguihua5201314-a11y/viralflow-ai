import {
  generateBriefDrivenScript,
  type BriefDrivenWriterProviderRequest,
  type BriefDrivenWriterProviderResponse,
} from "../../brief-driven-script-writer";
import type { ScriptWriterInput } from "../../brief-driven-script";
import { callProvider, DEFAULT_PROVIDER, getProviderStatuses, type ProviderResponse } from "../../provider-router";
import type { ProviderId } from "../../provider-types";

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
    const result = await generateBriefDrivenScript(body, adapter, {
      correlationId,
      providerIdentity: { providerRequested: requested, providerUsed, model: providerStatus.model },
      observe: ({ issues, ...event }) => console.warn(JSON.stringify({ event: "brief_driven_script_writer", ...event, ...(issues ? { issues: issues.map(({ code, path, stage, validator }) => ({ code, ...(path ? { path } : {}), stage, validator })) } : {}) })),
    });
    if (result.status === "failure") return Response.json({ ...result, error: { type: result.metadata.errorType, message: safeMessage(result.metadata.errorType) } }, { status: failureStatus(result.metadata.errorType) });
    return Response.json(result, { status: 201 });
  } catch {
    return Response.json({ status: "failure", script: null, issues: [], error: { type: "runtime_failure", message: "脚本生成失败，请重试。" } }, { status: 500 });
  }
}
