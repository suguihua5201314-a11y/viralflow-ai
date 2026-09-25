import { callProvider, DEFAULT_PROVIDER, getProviderStatuses, type ProviderResponse } from "../../provider-router";
import type { ProviderId } from "../../provider-types";
import { creativeBrainErrorType, type CreativeBrainInput, type CreativeBrainProviderRequest, type CreativeBrainProviderResponse } from "../../creative-brain";
import { generateCreativeDirections, type CreativeDirectionResult } from "../../creative-directions";

export const runtime = "nodejs";
export const maxDuration = 120;

export function resolveCreativeBrainProvider(
  requested: ProviderId,
  environment = process.env.VERCEL_ENV,
  previewOverride = process.env.CREATIVE_BRAIN_PROVIDER,
): ProviderId {
  if (environment !== "preview") return requested;
  const candidate = previewOverride?.trim();
  return candidate === "deepseek" || candidate === "doubao" || candidate === "openai" ? candidate : requested;
}

export function creativeBrainRouteError(error: unknown) {
  const type = creativeBrainErrorType(error);
  return {
    status: "failure" as const,
    error: {
      type,
      message: type === "timeout" ? "创意方向生成超时，请重试。" : "创意方向生成失败，请重试。",
    },
  };
}

export function creativeBrainFailurePayload(result: CreativeDirectionResult) {
  const type = result.metadata.errorType || "invalid_output";
  return {
    ...result,
    error: {
      type,
      message: type === "timeout" ? "创意方向生成超时，请重试。" : "创意方向生成失败，请重试。",
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreativeBrainInput & { provider?: ProviderId };
    if (!body.projectId?.trim() || !body.productContext?.productName?.trim() || !body.market?.trim() || !body.language?.trim() || !body.platform?.trim()) {
      return Response.json({ error: "Creative Brain input is incomplete" }, { status: 400 });
    }
    const requested = body.provider || DEFAULT_PROVIDER;
    if (!(requested in getProviderStatuses())) return Response.json({ error: "Unknown provider" }, { status: 400 });
    const providerUsed = resolveCreativeBrainProvider(requested);
    if (!(providerUsed in getProviderStatuses())) return Response.json({ error: "Unknown provider" }, { status: 400 });
    const adapter = async (input: CreativeBrainProviderRequest): Promise<CreativeBrainProviderResponse> => {
      const status = getProviderStatuses()[providerUsed];
      const response: ProviderResponse = await callProvider({ provider: providerUsed, ...input, purpose: "creative-brain", candidateCount: 3 });
      return { ...response, providerRequested: requested, providerUsed, model: status.model };
    };
    const result = await generateCreativeDirections(body, adapter);
    if (result.status === "failure") {
      const failure = creativeBrainFailurePayload(result);
      return Response.json(failure, { status: failure.error.type === "timeout" ? 504 : 502 });
    }
    return Response.json(result, { status: result.status === "success" ? 201 : result.status === "partial" ? 206 : 502 });
  } catch (error) {
    const failure = creativeBrainRouteError(error);
    return Response.json(failure, { status: failure.error.type === "timeout" ? 504 : 500 });
  }
}
