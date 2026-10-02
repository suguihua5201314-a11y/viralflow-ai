import {
  adaptScriptDraftToStructuredScript,
  deriveBriefLockedDecisions,
  parseScriptDraftV2,
  resolveScriptWriterLanguageContext,
  validateScriptDraftDeterministically,
  validateScriptWriterInput,
  type ScriptDraftV2,
  type ScriptWriterInput,
  type ScriptWriterValidationIssue,
} from "./brief-driven-script";
import type { StructuredScript } from "./script-generation";
import type { ProviderErrorType, ProviderId } from "./provider-types";
import { normalizeMarketIdentity, parseMarketIdentities } from "./market-identity";

export type BriefDrivenWriterProviderRequest = {
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  topP: number;
  maxTokens: number;
  timeoutMs: number;
};

export type BriefDrivenWriterProviderResponse = {
  content: string;
  providerRequested: ProviderId;
  providerUsed: ProviderId;
  model: string | null;
  responseTimeMs: number;
};

export type BriefDrivenWriterProvider = (request: BriefDrivenWriterProviderRequest) => Promise<BriefDrivenWriterProviderResponse>;

export type BriefDrivenWriterErrorType =
  | ProviderErrorType
  | "invalid_input"
  | "invalid_output"
  | "validation_failed"
  | "repair_failed";

export type BriefDrivenWriterMetadata = {
  providerRequested: ProviderId | null;
  providerUsed: ProviderId | null;
  model: string | null;
  latencyMs: number | null;
  repairAttempted: boolean;
  fallbackUsed: false;
  errorType: BriefDrivenWriterErrorType | null;
};

export type BriefDrivenWriterResult = {
  status: "success" | "failure";
  script: StructuredScript | null;
  draft: ScriptDraftV2 | null;
  metadata: BriefDrivenWriterMetadata;
  issues: ScriptWriterValidationIssue[];
};

export type BriefDrivenWriterObservation = {
  correlationId: string;
  attempt: number;
  stage:
    | "input_validation"
    | "provider_transport"
    | "provider_http"
    | "provider_parse"
    | "draft_json_parse"
    | "draft_schema"
    | "draft_fidelity"
    | "truth"
    | "compliance"
    | "numeric"
    | "repair_failed"
    | "completed";
  provider?: ProviderId | null;
  model?: string | null;
  latencyMs?: number | null;
  repairAttempted: boolean;
  issueCount?: number;
  issues?: ScriptWriterValidationIssue[];
  errorType?: BriefDrivenWriterErrorType | null;
};

export const BRIEF_DRIVEN_WRITER_BUDGET = {
  providerTimeoutMs: 45_000,
  maxTokens: 2_400,
  temperature: 0.65,
  topP: 0.9,
  maximumProviderAttempts: 2,
} as const;

const transportTypes = new Set<ProviderErrorType>([
  "timeout", "provider_http_error", "unauthorized", "invalid_model_or_endpoint", "rate_limit", "missing_field",
]);
const split = (value?: string) => String(value || "").split(/[；;\n,]+/).map((item) => item.trim()).filter(Boolean);
const safeIssue = (code: string, path?: string): ScriptWriterValidationIssue => ({ code, ...(path ? { path } : {}), stage: "input_identity", validator: "validateBriefDrivenWriterInput" });

export function validateBriefDrivenWriterInput(input: ScriptWriterInput): ScriptWriterValidationIssue[] {
  const issues = [...validateScriptWriterInput(input)];
  const languageContext = resolveScriptWriterLanguageContext(input);
  if (!input.requestId?.trim()) issues.push(safeIssue("missing_request_id", "requestId"));
  if (!languageContext.platform) issues.push(safeIssue("missing_platform", "languageContext.platform"));
  if (!languageContext.market) issues.push(safeIssue("missing_market", "languageContext.market"));
  if (!languageContext.targetLanguage) issues.push(safeIssue("missing_target_language", "languageContext.targetLanguage"));
  const configuredMarkets = parseMarketIdentities(input.productContext.productKnowledge?.markets);
  const requestMarket = normalizeMarketIdentity(input.market);
  if (configuredMarkets.length && !configuredMarkets.includes(requestMarket)) issues.push(safeIssue("market_mismatch", "market"));
  const preferences = input.preferences;
  if (preferences?.durationSeconds !== undefined && (!Number.isFinite(preferences.durationSeconds) || preferences.durationSeconds < 5 || preferences.durationSeconds > 180)) issues.push(safeIssue("invalid_duration_preference", "preferences.durationSeconds"));
  if (preferences?.variantCount !== undefined && preferences.variantCount !== 1) issues.push(safeIssue("invalid_variant_count", "preferences.variantCount"));
  for (const [key, value] of Object.entries({ creatorStyle: preferences?.creatorStyle, toneSteering: preferences?.toneSteering })) {
    if (value !== undefined && (typeof value !== "string" || !value.trim() || value.length > 500)) issues.push(safeIssue("invalid_expression_preference", `preferences.${key}`));
  }
  if (preferences?.spokenDensity !== undefined && !new Set(["light", "balanced", "dense"]).has(preferences.spokenDensity)) issues.push(safeIssue("invalid_spoken_density", "preferences.spokenDensity"));
  return issues;
}

function canonicalProductTruth(input: ScriptWriterInput) {
  const knowledge = input.productContext.productKnowledge;
  return {
    productName: input.productContext.productName,
    brand: knowledge?.brand || undefined,
    category: knowledge?.category || undefined,
    sellingPoints: split(knowledge?.sellingPoints),
    supportedParameters: split(knowledge?.parameters),
    price: knowledge?.price || undefined,
    offer: knowledge?.offer || undefined,
    factsOrNotes: split(knowledge?.notes),
    forbiddenClaims: split(knowledge?.bannedWords),
  };
}

const requiredShape = {
  title: "string",
  hook: { line: "string", openingVisualExecution: "string" },
  scenes: [{
    id: "stable unique string",
    purpose: "hook | context | product | evidence | cta",
    visual: "what is visible",
    action: "shootable action, without camera or Director settings",
    dialogue: "spoken or on-screen expression",
    durationHint: "optional positive number",
    evidenceRole: "Chinese description of this scene's evidence or narrative role",
    briefTrace: { executesOpeningVisual: "optional boolean", executesEvidence: "optional boolean", executesCTA: "optional boolean" },
  }],
  fullNarration: "string",
  cta: "string",
  workspaceLanguage: "zh-CN",
  targetLanguage: "future localization target copied from context",
  localizationStatus: "source",
  totalDurationHint: "optional positive number",
};

export const BRIEF_DRIVEN_WRITER_SYSTEM_PROMPT = [
  "You are the Script Writer. The creative strategy has already been decided.",
  "Execute the LOCKED CREATIVE BRIEF as natural short-form spoken content and shootable scene actions; do not create a new direction.",
  "Do not change the audience, use moment, motivation, tension, opportunity, angle, content mechanism, hook mechanism, opening visual concept, evidence strategy, CTA direction, Product Truth, or risk boundaries.",
  "Use CANONICAL PRODUCT TRUTH as the only factual authority. Never invent facts, effects, parameters, prices, offers, certifications, comparisons, or guarantees.",
  "Return exactly one ScriptDraftV2 JSON object. Do not return Markdown, identity fields, creativeAngle, product truth fields, camera/lens/lighting settings, or image/video prompts.",
  "The first scene must be purpose=hook and trace executesOpeningVisual=true. When evidence is required, include an evidence scene with executesEvidence=true. Include a CTA scene with executesCTA=true.",
  "Write the entire canonical source Draft in Simplified Chinese, including title, hook, dialogue, narration, CTA, opening visual execution, visual, action, and evidence role.",
  "targetLanguage and market are future localization context only. Do not output consumer copy in targetLanguage; avoid source-only wordplay that cannot be localized.",
  "Set workspaceLanguage=zh-CN, copy targetLanguage from context, and set localizationStatus=source.",
].join(" ");

export function buildBriefDrivenWriterMessages(input: ScriptWriterInput, repairIssues: ScriptWriterValidationIssue[] = []) {
  const languageContext = resolveScriptWriterLanguageContext(input);
  const repair = repairIssues.length ? {
    mode: "repair",
    instruction: "Return one corrected ScriptDraftV2. Fix only the listed output-contract, source-language, or claim-safety issues. For internal_language_mismatch or language_mismatch, preserve scene IDs, scene structure, Brief decisions, meaning, evidence strategy, CTA intent, Product Truth, and lineage; re-express only the affected field in Simplified Chinese. Keep the same locked Brief and do not select a new strategy.",
    issues: repairIssues.map(({ code, path, stage }) => ({ code, ...(path ? { path } : {}), stage })),
  } : undefined;
  return [
    { role: "system" as const, content: BRIEF_DRIVEN_WRITER_SYSTEM_PROMPT },
    { role: "user" as const, content: JSON.stringify({
      task: "Express this locked Creative Brief as one ScriptDraftV2",
      lockedCreativeBrief: deriveBriefLockedDecisions(input.creativeBrief),
      canonicalProductTruth: canonicalProductTruth(input),
      languageContext,
      expressionPreferences: input.preferences || {},
      outputContract: requiredShape,
      ...(repair ? { repair } : {}),
    }) },
  ];
}

function providerErrorType(error: unknown): BriefDrivenWriterErrorType {
  if (error && typeof error === "object" && "category" in error) return (error as { category: ProviderErrorType }).category;
  return "invalid_output";
}

export function isBriefDrivenWriterTransportFailure(error: unknown) {
  return transportTypes.has(providerErrorType(error) as ProviderErrorType);
}

function providerObservationStage(type: BriefDrivenWriterErrorType): BriefDrivenWriterObservation["stage"] {
  if (type === "unauthorized" || type === "invalid_model_or_endpoint" || type === "rate_limit") return "provider_http";
  if (type === "json_parse_error" || type === "empty_result") return "provider_parse";
  return "provider_transport";
}

function validationObservationStage(issues: ScriptWriterValidationIssue[]): BriefDrivenWriterObservation["stage"] {
  const stage = issues[0]?.stage;
  if (stage === "draft_parse") return "draft_json_parse";
  if (stage === "draft_schema") return "draft_schema";
  if (stage === "structural_fidelity") return "draft_fidelity";
  if (stage === "truth" || stage === "compliance" || stage === "numeric") return stage;
  return "draft_schema";
}

function metadata(): BriefDrivenWriterMetadata {
  return { providerRequested: null, providerUsed: null, model: null, latencyMs: null, repairAttempted: false, fallbackUsed: false, errorType: null };
}

export async function generateBriefDrivenScript(
  input: ScriptWriterInput,
  provider: BriefDrivenWriterProvider,
  options: {
    correlationId?: string;
    providerIdentity?: { providerRequested: ProviderId; providerUsed: ProviderId; model: string | null };
    observe?: (event: BriefDrivenWriterObservation) => void;
  } = {},
): Promise<BriefDrivenWriterResult> {
  const resultMetadata = metadata();
  const correlationId = options.correlationId || globalThis.crypto.randomUUID();
  if (options.providerIdentity) Object.assign(resultMetadata, options.providerIdentity);
  const inputIssues = validateBriefDrivenWriterInput(input);
  if (inputIssues.length) {
    resultMetadata.errorType = "invalid_input";
    options.observe?.({ correlationId, attempt: 0, stage: "input_validation", repairAttempted: false, issueCount: inputIssues.length, issues: inputIssues, errorType: resultMetadata.errorType });
    return { status: "failure", script: null, draft: null, metadata: resultMetadata, issues: inputIssues };
  }

  let issues: ScriptWriterValidationIssue[] = [];
  for (let attempt = 0; attempt < BRIEF_DRIVEN_WRITER_BUDGET.maximumProviderAttempts; attempt++) {
    let response: BriefDrivenWriterProviderResponse;
    try {
      response = await provider({
        messages: buildBriefDrivenWriterMessages(input, issues),
        temperature: BRIEF_DRIVEN_WRITER_BUDGET.temperature,
        topP: BRIEF_DRIVEN_WRITER_BUDGET.topP,
        maxTokens: BRIEF_DRIVEN_WRITER_BUDGET.maxTokens,
        timeoutMs: BRIEF_DRIVEN_WRITER_BUDGET.providerTimeoutMs,
      });
    } catch (error) {
      resultMetadata.errorType = providerErrorType(error);
      options.observe?.({ correlationId, attempt: attempt + 1, stage: providerObservationStage(resultMetadata.errorType), provider: resultMetadata.providerUsed, model: resultMetadata.model, repairAttempted: resultMetadata.repairAttempted, errorType: resultMetadata.errorType });
      return { status: "failure", script: null, draft: null, metadata: resultMetadata, issues };
    }

    resultMetadata.providerRequested = response.providerRequested;
    resultMetadata.providerUsed = response.providerUsed;
    resultMetadata.model = response.model;
    resultMetadata.latencyMs = (resultMetadata.latencyMs || 0) + response.responseTimeMs;
    const parsed = parseScriptDraftV2(response.content, { requireCanonicalLanguage: true });
    issues = parsed.value ? validateScriptDraftDeterministically(input, parsed.value) : parsed.issues;
    if (parsed.value && issues.length === 0) {
      const script = adaptScriptDraftToStructuredScript(input, parsed.value);
      options.observe?.({ correlationId, attempt: attempt + 1, stage: "completed", provider: response.providerUsed, model: response.model, latencyMs: resultMetadata.latencyMs, repairAttempted: resultMetadata.repairAttempted, issueCount: 0, errorType: null });
      return { status: "success", script, draft: parsed.value, metadata: resultMetadata, issues: [] };
    }

    options.observe?.({ correlationId, attempt: attempt + 1, stage: validationObservationStage(issues), provider: response.providerUsed, model: response.model, latencyMs: response.responseTimeMs, repairAttempted: resultMetadata.repairAttempted, issueCount: issues.length, issues });
    if (attempt === 0) {
      resultMetadata.repairAttempted = true;
      continue;
    }
    resultMetadata.errorType = "repair_failed";
    options.observe?.({ correlationId, attempt: attempt + 1, stage: "repair_failed", provider: response.providerUsed, model: response.model, latencyMs: resultMetadata.latencyMs, repairAttempted: true, issueCount: issues.length, issues, errorType: resultMetadata.errorType });
    return { status: "failure", script: null, draft: null, metadata: resultMetadata, issues };
  }
  resultMetadata.errorType = "validation_failed";
  return { status: "failure", script: null, draft: null, metadata: resultMetadata, issues };
}
