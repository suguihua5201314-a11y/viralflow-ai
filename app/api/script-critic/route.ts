import {
  generateScriptCritique,
  type ScriptCriticInput,
  type ScriptCriticProviderRequest,
  type ScriptCriticProviderResponse,
} from "../../brief-driven-script-critic";
import { callProvider, DEFAULT_PROVIDER, getProviderStatuses, type ProviderResponse } from "../../provider-router";
import type { ProviderId } from "../../provider-types";
import { persistQualityTracePatch, validQualityTraceId } from "../../quality-trace";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  return Response.json({ acceptanceHarnessEnabled: process.env.VERCEL_ENV === "preview" });
}

export function resolveScriptCriticProvider(
  requested: ProviderId,
  environment = process.env.VERCEL_ENV,
  previewOverride = process.env.SCRIPT_CRITIC_PROVIDER,
  previewCreativeProvider = process.env.CREATIVE_BRAIN_PROVIDER,
): ProviderId {
  if (environment !== "preview") return requested;
  const value = previewOverride?.trim() || previewCreativeProvider?.trim();
  return value === "deepseek" || value === "doubao" || value === "openai" ? value : requested;
}

function requestShape(value: unknown): value is ScriptCriticInput & { provider?: ProviderId } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Partial<ScriptCriticInput>;
  return Boolean(item.projectId && item.requestId && item.creativeBriefReference && item.creativeBrief && item.canonicalProductContext && item.scriptDraft);
}

function safeMessage(type: string | null) {
  if (type === "timeout") return "脚本评审超时，请重试。";
  if (type === "invalid_input") return "Brief-aware Script Critic input is invalid.";
  if (type === "repair_failed" || type === "invalid_output") return "脚本评审结果未通过结构校验。";
  return "脚本评审失败，请重试。";
}

function failureStatus(type: string | null) {
  if (type === "invalid_input") return 400;
  if (type === "timeout") return 504;
  if (type === "repair_failed" || type === "invalid_output") return 422;
  return 502;
}

export async function POST(request: Request) {
  const correlationId = globalThis.crypto.randomUUID();
  let body: ScriptCriticInput & { provider?: ProviderId };
  try {
    const parsed: unknown = await request.json();
    if (!requestShape(parsed)) return Response.json({ status: "failure", critique: null, validationIssues: [], error: { type: "invalid_input", message: safeMessage("invalid_input") } }, { status: 400 });
    body = parsed;
  } catch {
    return Response.json({ status: "failure", critique: null, validationIssues: [], error: { type: "invalid_input", message: safeMessage("invalid_input") } }, { status: 400 });
  }

  const requested = body.provider || DEFAULT_PROVIDER;
  const statuses = getProviderStatuses();
  if (typeof requested !== "string" || !(requested in statuses)) return Response.json({ status: "failure", critique: null, validationIssues: [], error: { type: "invalid_provider", message: "Script Critic provider is unavailable." } }, { status: 400 });
  const providerUsed = resolveScriptCriticProvider(requested);
  if (!(providerUsed in statuses)) return Response.json({ status: "failure", critique: null, validationIssues: [], error: { type: "invalid_provider", message: "Script Critic provider is unavailable." } }, { status: 400 });
  const providerStatus = statuses[providerUsed];
  const adapter = async (input: ScriptCriticProviderRequest): Promise<ScriptCriticProviderResponse> => {
    const response: ProviderResponse = await callProvider({ ...input, provider: providerUsed, purpose: "script-critic", candidateCount: 1 });
    return { ...response, providerRequested: requested, providerUsed, model: providerStatus.model };
  };

  try {
    const result = await generateScriptCritique(body, adapter, {
      correlationId,
      providerIdentity: { providerRequested: requested, providerUsed, model: providerStatus.model },
      observe: ({ issues, ...event }) => console.warn(JSON.stringify({ event: "brief_aware_script_critic", ...event, ...(issues ? { issues: issues.map(({ code, path, stage, validator }) => ({ code, ...(path ? { path } : {}), stage, validator })) } : {}) })),
    });
    if (validQualityTraceId(body.qualityTraceId)) await persistQualityTracePatch({ qualityTraceId: body.qualityTraceId, critic: { input: body, output: result } });
    if (result.status === "failure") return Response.json({ ...result, error: { type: result.metadata.errorType, message: safeMessage(result.metadata.errorType) } }, { status: failureStatus(result.metadata.errorType) });
    return Response.json(result, { status: 200 });
  } catch {
    return Response.json({ status: "failure", critique: null, validationIssues: [], error: { type: "runtime_failure", message: "脚本评审失败，请重试。" } }, { status: 500 });
  }
}
