import { callProvider, DEFAULT_PROVIDER, getProviderStatuses, type ProviderResponse } from "../../provider-router";
import type { ProviderId } from "../../provider-types";
import { creativeBrainErrorType, resolveCreativeBrainLanguageContext, type CreativeBrainInput, type CreativeBrainProviderRequest, type CreativeBrainProviderResponse } from "../../creative-brain";
import { generateCreativeDirections, validateGroundedCreativeBrainInput, type CreativeDirectionResult } from "../../creative-directions";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET() {
  return Response.json({ acceptanceHarnessEnabled: process.env.VERCEL_ENV === "preview" });
}

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
    validationSummary: { issues: [], diversityPassed: result.validationSummary.diversityPassed },
    error: {
      type,
      message: type === "timeout" ? "创意方向生成超时，请重试。" : "创意方向生成失败，请重试。",
    },
  };
}

export async function POST(request: Request) {
  try {
    const correlationId = globalThis.crypto.randomUUID();
    const body = await request.json() as CreativeBrainInput & { provider?: ProviderId };
    const languageContext = resolveCreativeBrainLanguageContext(body);
    if (!body.projectId?.trim() || !body.productContext?.productName?.trim() || !languageContext.market || !languageContext.targetLanguage || !languageContext.platform) {
      return Response.json({ error: "Creative Brain input is incomplete" }, { status: 400 });
    }
    const inputIssues = validateGroundedCreativeBrainInput(body);
    if (inputIssues.length) return Response.json({ status: "failure", directions: [], issues: inputIssues, error: { type: "invalid_input", message: "Product Context is not coherently grounded" } }, { status: 400 });
    const requested = body.provider || DEFAULT_PROVIDER;
    if (!(requested in getProviderStatuses())) return Response.json({ error: "Unknown provider" }, { status: 400 });
    const providerUsed = resolveCreativeBrainProvider(requested);
    if (!(providerUsed in getProviderStatuses())) return Response.json({ error: "Unknown provider" }, { status: 400 });
    const adapter = async (input: CreativeBrainProviderRequest): Promise<CreativeBrainProviderResponse> => {
      const status = getProviderStatuses()[providerUsed];
      const response: ProviderResponse = await callProvider({ provider: providerUsed, ...input, purpose: "creative-brain", candidateCount: 3 });
      return { ...response, providerRequested: requested, providerUsed, model: status.model };
    };
    const result = await generateCreativeDirections(body, adapter, {
      observe(diagnostic) {
        console.log(JSON.stringify({ scope: "creative_direction_validation", correlationId, event: "attempt_validated", ...diagnostic }));
      },
      observeRepair(diagnostic) {
        console.log(JSON.stringify({ scope: "creative_direction_validation", correlationId, event: "repair_issue_propagation", ...diagnostic }));
      },
    });
    console.log(JSON.stringify({
      scope: "creative_direction_validation",
      correlationId,
      event: "terminal",
      status: result.status,
      errorType: result.metadata.errorType,
      repairAttempted: result.metadata.repairAttempted,
      attemptCount: result.validationDiagnostics?.attempts.length || 0,
      finalValidCandidateCount: result.metadata.validCandidateCount,
      diversityPassed: result.validationSummary.diversityPassed,
    }));
    if (result.status === "failure") {
      const failure = { ...creativeBrainFailurePayload(result), correlationId };
      return Response.json(failure, { status: failure.error.type === "timeout" ? 504 : 502 });
    }
    return Response.json(result, { status: result.status === "success" ? 201 : result.status === "partial" ? 206 : 502 });
  } catch (error) {
    const failure = creativeBrainRouteError(error);
    return Response.json(failure, { status: failure.error.type === "timeout" ? 504 : 500 });
  }
}
