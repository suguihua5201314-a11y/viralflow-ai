import { callProvider, DEFAULT_PROVIDER, getProviderStatuses, type ProviderResponse } from "../../provider-router";
import type { ProviderId } from "../../provider-types";
import { generateCreativeBrief, type CreativeBriefExpansionInput } from "../../creative-brief-expansion";
import type { CreativeBrainProviderRequest, CreativeBrainProviderResponse } from "../../creative-brain";

export const runtime = "nodejs";
export const maxDuration = 120;

function resolveProvider(requested: ProviderId) {
  if (process.env.VERCEL_ENV !== "preview") return requested;
  const value = process.env.CREATIVE_BRAIN_PROVIDER?.trim();
  return value === "deepseek" || value === "doubao" || value === "openai" ? value : requested;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreativeBriefExpansionInput & { provider?: ProviderId };
    if (!body.projectId?.trim() || !body.selectedDirection?.id || !body.productContext?.productName?.trim() || !body.productContextFingerprint?.trim()) return Response.json({ status: "failure", error: { type: "invalid_input", message: "Creative Brief input is incomplete" } }, { status: 400 });
    const requested = body.provider || DEFAULT_PROVIDER;
    const providerUsed = resolveProvider(requested);
    const status = getProviderStatuses()[providerUsed];
    if (!status) return Response.json({ status: "failure", error: { type: "invalid_provider", message: "Creative Brief provider is unavailable" } }, { status: 400 });
    const adapter = async (input: CreativeBrainProviderRequest): Promise<CreativeBrainProviderResponse> => {
      const response: ProviderResponse = await callProvider({ provider: providerUsed, ...input, purpose: "creative-brief", candidateCount: 1 });
      return { ...response, providerRequested: requested, providerUsed, model: status.model };
    };
    const result = await generateCreativeBrief(body, adapter);
    if (result.status === "failure") return Response.json({ ...result, error: { type: result.metadata.errorType, message: "创意简报生成失败，请重试" } }, { status: result.metadata.errorType === "provider_failure" ? 502 : 422 });
    return Response.json(result, { status: 201 });
  } catch {
    return Response.json({ status: "failure", brief: null, error: { type: "runtime_failure", message: "创意简报生成失败，请重试" } }, { status: 500 });
  }
}
