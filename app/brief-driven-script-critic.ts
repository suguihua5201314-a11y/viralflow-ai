import {
  deriveBriefLockedDecisions,
  parseScriptDraftV2,
  validateScriptDraftDeterministically,
  type BriefAwareCriticIssueCode,
  type CriticIssue,
  type CriticIssueTarget,
  type ScriptDraftV2,
  type ScriptWriterInput,
} from "./brief-driven-script";
import { validateBriefDrivenWriterInput } from "./brief-driven-script-writer";
import type { CreativeBriefV2 } from "./creative-contract";
import type { CanonicalProductContext } from "./product-context";
import type { ProviderErrorType, ProviderId } from "./provider-types";

export type ScriptCriticInput = {
  projectId: string;
  requestId: string;
  creativeBriefReference: { briefId: string; briefRevisionId: string };
  creativeBrief: CreativeBriefV2;
  canonicalProductContext: CanonicalProductContext;
  productContextFingerprint: string;
  scriptDraft: ScriptDraftV2;
  platform: string;
  market: string;
  language: string;
  preferences?: {
    creatorStyle?: string;
    durationPreference?: number;
    spokenDensity?: "light" | "balanced" | "dense";
    tone?: string;
  };
};

export type ScriptCriticResult = {
  verdict: "pass" | "needs_rewrite";
  issues: CriticIssue[];
  summary?: string;
};

export type ScriptCriticValidationIssue = {
  code: string;
  path?: string;
  stage: "input_validation" | "critic_json_parse" | "critic_schema" | "critic_target";
  validator: string;
};

export type ScriptCriticProviderRequest = {
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  topP: number;
  maxTokens: number;
  timeoutMs: number;
};

export type ScriptCriticProviderResponse = {
  content: string;
  providerRequested: ProviderId;
  providerUsed: ProviderId;
  model: string | null;
  responseTimeMs: number;
};

export type ScriptCriticProvider = (request: ScriptCriticProviderRequest) => Promise<ScriptCriticProviderResponse>;

export type ScriptCriticMetadata = {
  providerRequested: ProviderId | null;
  providerUsed: ProviderId | null;
  model: string | null;
  latencyMs: number | null;
  repairAttempted: boolean;
  fallbackUsed: false;
  errorType: ProviderErrorType | "invalid_input" | "invalid_output" | "repair_failed" | null;
};

export type BriefAwareScriptCriticResponse = {
  status: "success" | "failure";
  critique: ScriptCriticResult | null;
  metadata: ScriptCriticMetadata;
  validationIssues: ScriptCriticValidationIssue[];
};

export type ScriptCriticObservation = {
  correlationId: string;
  attempt: number;
  stage: "input_validation" | "provider_transport" | "provider_http" | "provider_parse" | "critic_json_parse" | "critic_schema" | "critic_target" | "repair_failed" | "completed";
  provider?: ProviderId | null;
  model?: string | null;
  latencyMs?: number | null;
  repairAttempted: boolean;
  issueCount?: number;
  issues?: ScriptCriticValidationIssue[];
  errorType?: ScriptCriticMetadata["errorType"];
};

export const SCRIPT_CRITIC_BUDGET = {
  providerTimeoutMs: 45_000,
  maxTokens: 1_800,
  temperature: 0.2,
  topP: 0.85,
  maximumProviderAttempts: 2,
  maximumIssues: 8,
} as const;

const criticCodes = new Set<BriefAwareCriticIssueCode>([
  "brief_angle_drift", "hook_intent_drift", "opening_visual_mismatch", "evidence_strategy_drift", "cta_direction_drift",
  "ugc_advertising_tone", "ugc_unnatural_dialogue", "ugc_overwritten", "ugc_repetitive",
  "unsupported_causal_claim", "evidence_dialogue_mismatch", "unobservable_claim", "visual_action_mismatch",
  "weak_hook_execution", "hook_visual_disconnect", "scene_redundancy", "scene_filler", "scene_not_filmmable", "scene_pacing_issue",
  "cta_too_hard", "cta_unsupported_claim",
]);
const severities = new Set(["critical", "major", "minor"]);
const scopes = new Set(["title", "hook", "scene", "narration", "cta"]);
const fieldsByScope: Record<CriticIssueTarget["scope"], Set<string>> = {
  title: new Set(["title"]),
  hook: new Set(["line", "openingVisualExecution"]),
  scene: new Set(["purpose", "visual", "action", "dialogue", "durationHint", "evidenceRole"]),
  narration: new Set(["fullNarration"]),
  cta: new Set(["cta"]),
};
const briefFields = new Set([
  "targetAudience", "useMoment", "purchaseMotivation", "tensionOrObjection", "creativeOpportunity", "contentMechanisms",
  "creativeAngle", "hookMechanism", "hookLine", "openingVisual", "evidenceStrategy", "ctaDirection", "riskBoundaries",
]);
const topFields = new Set(["verdict", "issues", "summary"]);
const issueFields = new Set(["code", "severity", "target", "message", "rewriteInstruction", "deterministic", "briefField"]);
const targetFields = new Set(["scope", "sceneId", "field"]);
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
const validationIssue = (code: string, stage: ScriptCriticValidationIssue["stage"], path?: string): ScriptCriticValidationIssue => ({ code, ...(path ? { path } : {}), stage, validator: stage === "input_validation" ? "validateScriptCriticInput" : "parseScriptCriticResult" });

function writerInput(input: ScriptCriticInput): ScriptWriterInput {
  return {
    projectId: input.projectId,
    requestId: input.requestId,
    creativeBriefReference: { id: input.creativeBriefReference.briefId, revisionId: input.creativeBriefReference.briefRevisionId },
    creativeBrief: input.creativeBrief,
    productContext: input.canonicalProductContext,
    productContextFingerprint: input.productContextFingerprint,
    platform: input.platform,
    market: input.market,
    language: input.language,
    preferences: {
      creatorStyle: input.preferences?.creatorStyle,
      durationSeconds: input.preferences?.durationPreference,
      spokenDensity: input.preferences?.spokenDensity,
      toneSteering: input.preferences?.tone,
      variantCount: 1,
    },
  };
}

export function validateScriptCriticInput(input: ScriptCriticInput): ScriptCriticValidationIssue[] {
  if (!isRecord(input)) return [validationIssue("invalid_input", "input_validation")];
  const issues: ScriptCriticValidationIssue[] = [];
  if (!isText(input.requestId)) issues.push(validationIssue("missing_request_id", "input_validation", "requestId"));
  if (!isRecord(input.creativeBriefReference)) issues.push(validationIssue("missing_brief_reference", "input_validation", "creativeBriefReference"));
  if (!isRecord(input.creativeBriefReference) || !isRecord(input.creativeBrief) || !isRecord(input.canonicalProductContext)) return [...issues, validationIssue("invalid_input", "input_validation")];
  const adapted = writerInput(input);
  for (const item of validateBriefDrivenWriterInput(adapted)) issues.push(validationIssue(item.code, "input_validation", item.path));
  const parsedDraft = parseScriptDraftV2(JSON.stringify(input.scriptDraft));
  if (!parsedDraft.value) for (const item of parsedDraft.issues) issues.push(validationIssue(item.code, "input_validation", item.path));
  else for (const item of validateScriptDraftDeterministically(adapted, parsedDraft.value)) issues.push(validationIssue(item.code, "input_validation", item.path));
  return issues.filter((item, index, all) => index === all.findIndex((candidate) => candidate.code === item.code && candidate.path === item.path));
}

function unexpected(value: Record<string, unknown>, allowed: Set<string>, base: string, issues: ScriptCriticValidationIssue[]) {
  for (const key of Object.keys(value)) if (!allowed.has(key)) issues.push(validationIssue("unexpected_field", "critic_schema", base ? `${base}.${key}` : key));
}

export function parseScriptCriticResult(content: string, draft: ScriptDraftV2): { value: ScriptCriticResult | null; issues: ScriptCriticValidationIssue[] } {
  let parsed: unknown;
  try { parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")); }
  catch { return { value: null, issues: [validationIssue("invalid_json", "critic_json_parse")] }; }
  if (!isRecord(parsed)) return { value: null, issues: [validationIssue("invalid_top_level", "critic_schema")] };
  const issues: ScriptCriticValidationIssue[] = [];
  unexpected(parsed, topFields, "", issues);
  if (parsed.verdict !== "pass" && parsed.verdict !== "needs_rewrite") issues.push(validationIssue("invalid_verdict", "critic_schema", "verdict"));
  if (parsed.summary !== undefined && !isText(parsed.summary)) issues.push(validationIssue("invalid_type", "critic_schema", "summary"));
  if (!Array.isArray(parsed.issues)) issues.push(validationIssue("invalid_type", "critic_schema", "issues"));
  else {
    if (parsed.issues.length > SCRIPT_CRITIC_BUDGET.maximumIssues) issues.push(validationIssue("too_many_issues", "critic_schema", "issues"));
    const sceneIds = new Set(draft.scenes.map((scene) => scene.id));
    parsed.issues.forEach((raw, index) => {
      const base = `issues.${index}`;
      if (!isRecord(raw)) { issues.push(validationIssue("invalid_type", "critic_schema", base)); return; }
      unexpected(raw, issueFields, base, issues);
      if (!criticCodes.has(raw.code as BriefAwareCriticIssueCode)) issues.push(validationIssue("invalid_issue_code", "critic_schema", `${base}.code`));
      if (!severities.has(raw.severity as string)) issues.push(validationIssue("invalid_severity", "critic_schema", `${base}.severity`));
      if (!isText(raw.message)) issues.push(validationIssue("invalid_type", "critic_schema", `${base}.message`));
      if (!isText(raw.rewriteInstruction)) issues.push(validationIssue("invalid_type", "critic_schema", `${base}.rewriteInstruction`));
      if (raw.deterministic !== false) issues.push(validationIssue("invalid_deterministic_flag", "critic_schema", `${base}.deterministic`));
      if (raw.briefField !== undefined && !briefFields.has(raw.briefField as string)) issues.push(validationIssue("invalid_brief_field", "critic_schema", `${base}.briefField`));
      if (!isRecord(raw.target)) { issues.push(validationIssue("invalid_target", "critic_target", `${base}.target`)); return; }
      unexpected(raw.target, targetFields, `${base}.target`, issues);
      const scope = raw.target.scope as CriticIssueTarget["scope"];
      if (!scopes.has(scope)) { issues.push(validationIssue("invalid_target_scope", "critic_target", `${base}.target.scope`)); return; }
      if (scope === "scene") {
        if (!isText(raw.target.sceneId) || !sceneIds.has(raw.target.sceneId)) issues.push(validationIssue("unknown_scene", "critic_target", `${base}.target.sceneId`));
      } else if (raw.target.sceneId !== undefined) issues.push(validationIssue("unexpected_scene_id", "critic_target", `${base}.target.sceneId`));
      if (!isText(raw.target.field) || !fieldsByScope[scope].has(raw.target.field)) issues.push(validationIssue("invalid_target_field", "critic_target", `${base}.target.field`));
    });
    if (parsed.verdict === "pass" && parsed.issues.some((item) => isRecord(item) && item.severity !== "minor")) issues.push(validationIssue("pass_has_blocking_issue", "critic_schema", "verdict"));
  }
  return issues.length ? { value: null, issues } : { value: structuredClone(parsed as ScriptCriticResult), issues: [] };
}

function compactProductTruth(input: ScriptCriticInput) {
  const knowledge = input.canonicalProductContext.productKnowledge;
  const split = (value?: string) => String(value || "").split(/[；;\n]+/).map((item) => item.trim()).filter(Boolean);
  return {
    productName: input.canonicalProductContext.productName,
    brand: knowledge?.brand || undefined,
    category: knowledge?.category || undefined,
    facts: split(knowledge?.notes),
    sellingPoints: split(knowledge?.sellingPoints),
    parameters: split(knowledge?.parameters),
    offer: knowledge?.offer || undefined,
    forbiddenClaims: split(knowledge?.bannedWords),
  };
}

export const SCRIPT_CRITIC_SYSTEM_PROMPT = [
  "You are a brief-aware Script Critic. Diagnose fidelity and execution quality; do not rewrite the script or invent a new creative direction.",
  "The LOCKED CREATIVE BRIEF is authoritative for audience, moment, motivation, angle, mechanism, hook intent, opening visual, evidence strategy, CTA direction, and risk boundaries.",
  "Evaluate semantic Brief fidelity, hook and opening-visual execution, evidence observability, visual/action/dialogue coherence, UGC spoken naturalness, repetition, pacing, filmability, CTA coherence, and semantic truth/compliance risk.",
  "Do not report deterministic schema, trace, identity, language-field, numeric, or literal banned-claim checks already enforced by code. Do not score, rank, rewrite, or return replacement copy.",
  "Return exactly one JSON object containing verdict, at most 8 actionable issues, and an optional summary. Use only the supplied stable issue codes, severities, targets, and existing scene IDs.",
].join(" ");

const outputContract = {
  verdict: "pass | needs_rewrite",
  issues: [{
    code: [...criticCodes], severity: "critical | major | minor",
    target: { scope: "title | hook | scene | narration | cta", sceneId: "required only for scene", field: "valid field for target scope" },
    message: "concise diagnosis", rewriteInstruction: "localized correction instruction, not replacement copy", deterministic: false,
    briefField: "optional locked Brief field",
  }],
  summary: "optional concise summary",
};

export function buildScriptCriticMessages(input: ScriptCriticInput, repairIssues: ScriptCriticValidationIssue[] = []) {
  const repair = repairIssues.length ? {
    instruction: "Return only a corrected critique JSON object. Repair the output schema and target references; do not change the script, Brief, Product Truth, or critique strategy.",
    issues: repairIssues.map(({ code, path, stage }) => ({ code, ...(path ? { path } : {}), stage })),
  } : undefined;
  return [
    { role: "system" as const, content: SCRIPT_CRITIC_SYSTEM_PROMPT },
    { role: "user" as const, content: JSON.stringify({
      task: "Critique this draft against its locked Creative Brief without rewriting it",
      lockedCreativeBrief: deriveBriefLockedDecisions(input.creativeBrief),
      canonicalProductTruth: compactProductTruth(input),
      context: { platform: input.platform, market: input.market, language: input.language, preferences: input.preferences || {} },
      scriptDraft: input.scriptDraft,
      outputContract,
      ...(repair ? { repair } : {}),
    }) },
  ];
}

function providerError(error: unknown): ScriptCriticMetadata["errorType"] {
  if (error && typeof error === "object" && "category" in error) return (error as { category: ProviderErrorType }).category;
  return "invalid_output";
}

function providerStage(type: ScriptCriticMetadata["errorType"]): ScriptCriticObservation["stage"] {
  if (type === "unauthorized" || type === "invalid_model_or_endpoint" || type === "rate_limit") return "provider_http";
  if (type === "json_parse_error" || type === "empty_result") return "provider_parse";
  return "provider_transport";
}

function metadata(): ScriptCriticMetadata {
  return { providerRequested: null, providerUsed: null, model: null, latencyMs: null, repairAttempted: false, fallbackUsed: false, errorType: null };
}

export async function generateScriptCritique(
  input: ScriptCriticInput,
  provider: ScriptCriticProvider,
  options: {
    correlationId?: string;
    providerIdentity?: { providerRequested: ProviderId; providerUsed: ProviderId; model: string | null };
    observe?: (event: ScriptCriticObservation) => void;
  } = {},
): Promise<BriefAwareScriptCriticResponse> {
  const resultMetadata = metadata();
  const correlationId = options.correlationId || globalThis.crypto.randomUUID();
  if (options.providerIdentity) Object.assign(resultMetadata, options.providerIdentity);
  const inputIssues = validateScriptCriticInput(input);
  if (inputIssues.length) {
    resultMetadata.errorType = "invalid_input";
    options.observe?.({ correlationId, attempt: 0, stage: "input_validation", repairAttempted: false, issueCount: inputIssues.length, issues: inputIssues, errorType: resultMetadata.errorType });
    return { status: "failure", critique: null, metadata: resultMetadata, validationIssues: inputIssues };
  }

  let parseIssues: ScriptCriticValidationIssue[] = [];
  for (let attempt = 0; attempt < SCRIPT_CRITIC_BUDGET.maximumProviderAttempts; attempt++) {
    let response: ScriptCriticProviderResponse;
    try {
      response = await provider({
        messages: buildScriptCriticMessages(input, parseIssues),
        temperature: SCRIPT_CRITIC_BUDGET.temperature,
        topP: SCRIPT_CRITIC_BUDGET.topP,
        maxTokens: SCRIPT_CRITIC_BUDGET.maxTokens,
        timeoutMs: SCRIPT_CRITIC_BUDGET.providerTimeoutMs,
      });
    } catch (error) {
      resultMetadata.errorType = providerError(error);
      options.observe?.({ correlationId, attempt: attempt + 1, stage: providerStage(resultMetadata.errorType), provider: resultMetadata.providerUsed, model: resultMetadata.model, repairAttempted: resultMetadata.repairAttempted, errorType: resultMetadata.errorType });
      return { status: "failure", critique: null, metadata: resultMetadata, validationIssues: parseIssues };
    }
    resultMetadata.providerRequested = response.providerRequested;
    resultMetadata.providerUsed = response.providerUsed;
    resultMetadata.model = response.model;
    resultMetadata.latencyMs = (resultMetadata.latencyMs || 0) + response.responseTimeMs;
    const parsed = parseScriptCriticResult(response.content, input.scriptDraft);
    if (parsed.value) {
      options.observe?.({ correlationId, attempt: attempt + 1, stage: "completed", provider: response.providerUsed, model: response.model, latencyMs: resultMetadata.latencyMs, repairAttempted: resultMetadata.repairAttempted, issueCount: parsed.value.issues.length, errorType: null });
      return { status: "success", critique: parsed.value, metadata: resultMetadata, validationIssues: [] };
    }
    parseIssues = parsed.issues;
    const stage = parseIssues[0]?.stage || "critic_schema";
    options.observe?.({ correlationId, attempt: attempt + 1, stage, provider: response.providerUsed, model: response.model, latencyMs: response.responseTimeMs, repairAttempted: resultMetadata.repairAttempted, issueCount: parseIssues.length, issues: parseIssues });
    if (attempt === 0) { resultMetadata.repairAttempted = true; continue; }
  }
  resultMetadata.errorType = "repair_failed";
  options.observe?.({ correlationId, attempt: SCRIPT_CRITIC_BUDGET.maximumProviderAttempts, stage: "repair_failed", provider: resultMetadata.providerUsed, model: resultMetadata.model, latencyMs: resultMetadata.latencyMs, repairAttempted: true, issueCount: parseIssues.length, issues: parseIssues, errorType: resultMetadata.errorType });
  return { status: "failure", critique: null, metadata: resultMetadata, validationIssues: parseIssues };
}
