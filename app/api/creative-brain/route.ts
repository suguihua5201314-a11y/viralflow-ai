import { callProvider, DEFAULT_PROVIDER, getProviderStatuses, type ProviderResponse } from "../../provider-router";
import type { ProviderId } from "../../provider-types";
import { generateCreativeOpportunities, type CreativeBrainInput, type CreativeBrainProviderRequest, type CreativeBrainProviderResponse } from "../../creative-brain";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json() as CreativeBrainInput & { provider?: ProviderId };
    if (!body.projectId?.trim() || !body.productContext?.productName?.trim() || !body.market?.trim() || !body.language?.trim() || !body.platform?.trim()) {
      return Response.json({ error: "Creative Brain input is incomplete" }, { status: 400 });
    }
    const requested = body.provider || DEFAULT_PROVIDER;
    if (!(requested in getProviderStatuses())) return Response.json({ error: "Unknown provider" }, { status: 400 });
    const adapter = async (input: CreativeBrainProviderRequest): Promise<CreativeBrainProviderResponse> => {
      const status = getProviderStatuses()[requested];
      const response: ProviderResponse = await callProvider({ provider: requested, ...input });
      return { ...response, providerRequested: requested, providerUsed: requested, model: status.model };
    };
    const result = await generateCreativeOpportunities(body, adapter);
    return Response.json(result, { status: result.status === "success" ? 201 : result.status === "partial" ? 206 : 502 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Creative Brain failed" }, { status: 500 });
  }
}
