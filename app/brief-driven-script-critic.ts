import {
  deriveBriefLockedDecisions,
  parseScriptDraftV2,
  resolveScriptWriterLanguageContext,
  CRITIC_BRIEF_FIELD_VALUES,
  CRITIC_ISSUE_CODE_VALUES,
  CRITIC_TARGET_SCHEMA,
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
import { validateInternalCreativeLanguage, type CreationLanguageContext } from "./creation-language-context";

export { CRITIC_BRIEF_FIELD_VALUES, CRITIC_ISSUE_CODE_VALUES, CRITIC_TARGET_SCHEMA } from "./brief-driven-script";

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
  languageContext?: CreationLanguageContext;
  language?: string;
  workspaceLanguage?: "zh-CN";
  targetLanguage?: string;
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
  rejectedTargetRef?: string;
  rejectedIssueCode?: string;
  stage: "input_validation" | "critic_json_parse" | "critic_schema" | "critic_target" | "critic_language";
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
  stage: "input_validation" | "provider_transport" | "provider_http" | "provider_parse" | "critic_json_parse" | "critic_schema" | "critic_target" | "critic_language" | "repair_failed" | "completed";
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

const criticCodes = new Set<BriefAwareCriticIssueCode>(CRITIC_ISSUE_CODE_VALUES);
const severities = new Set(["critical", "major", "minor"]);
const fieldsByScope = Object.fromEntries(Object.entries(CRITIC_TARGET_SCHEMA).map(([scope, fields]) => [scope, new Set(fields)])) as Record<CriticIssueTarget["scope"], Set<string>>;
const briefFields = new Set<string>(CRITIC_BRIEF_FIELD_VALUES);
const topFields = new Set(["verdict", "issues", "summary"]);
const issueFields = new Set(["code", "severity", "targetRef", "message", "rewriteInstruction", "deterministic", "briefField"]);
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
    languageContext: input.languageContext,
    workspaceLanguage: input.workspaceLanguage,
    targetLanguage: input.targetLanguage,
    preferences: {
      creatorStyle: input.preferences?.creatorStyle,
      durationSeconds: input.preferences?.durationPreference,
      spokenDensity: input.preferences?.spokenDensity,
      toneSteering: input.preferences?.tone,
      variantCount: 1,
    },
  };
}

export type CriticReviewTarget = { targetRef: string; target: CriticIssueTarget; path: string };

const fixedTargets: Array<[string, CriticIssueTarget, string]> = [
  ["TITLE", { scope: "title", field: "title" }, "title"],
  ["HOOK_LINE", { scope: "hook", field: "line" }, "hook.line"],
  ["HOOK_OPENING_VISUAL", { scope: "hook", field: "openingVisualExecution" }, "hook.openingVisualExecution"],
  ["FULL_NARRATION", { scope: "narration", field: "fullNarration" }, "fullNarration"],
  ["CTA", { scope: "cta", field: "cta" }, "cta"],
];
const sceneTargetRef = (sceneId: string, field: "visual" | "action" | "dialogue" | "evidenceRole") => `SCENE:${encodeURIComponent(sceneId)}:${field.toUpperCase()}`;

export function buildCriticReviewTargetCatalog(draft: ScriptDraftV2): CriticReviewTarget[] {
  const catalog = fixedTargets.map(([targetRef, target, path]) => ({ targetRef, target, path }));
  draft.scenes.forEach((scene, index) => {
    for (const field of CRITIC_TARGET_SCHEMA.scene) {
      if (typeof scene[field] !== "string") continue;
      catalog.push({ targetRef: sceneTargetRef(scene.id, field), target: { scope: "scene", sceneId: scene.id, field }, path: `scenes.${index}.${field}` });
    }
  });
  return catalog;
}

export function resolveCriticTargetRef(draft: ScriptDraftV2, targetRef: string): CriticIssueTarget | null {
  const matches = buildCriticReviewTargetCatalog(draft).filter((entry) => entry.targetRef === targetRef);
  return matches.length === 1 ? structuredClone(matches[0].target) : null;
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
    const normalizedIssues: CriticIssue[] = [];
    parsed.issues.forEach((raw, index) => {
      const base = `issues.${index}`;
      if (!isRecord(raw)) { issues.push(validationIssue("invalid_type", "critic_schema", base)); return; }
      unexpected(raw, issueFields, base, issues);
      if (!criticCodes.has(raw.code as BriefAwareCriticIssueCode)) {
        const invalid = validationIssue("invalid_issue_code", "critic_schema", `${base}.code`);
        if (isText(raw.code) && raw.code.length <= 80 && /^[a-z][a-z0-9_]*$/.test(raw.code)) invalid.rejectedIssueCode = raw.code;
        issues.push(invalid);
      }
      if (!severities.has(raw.severity as string)) issues.push(validationIssue("invalid_severity", "critic_schema", `${base}.severity`));
      if (!isText(raw.message)) issues.push(validationIssue("invalid_type", "critic_schema", `${base}.message`));
      if (!isText(raw.rewriteInstruction)) issues.push(validationIssue("invalid_type", "critic_schema", `${base}.rewriteInstruction`));
      if (raw.deterministic !== false) issues.push(validationIssue("invalid_deterministic_flag", "critic_schema", `${base}.deterministic`));
      if (raw.briefField !== undefined && !briefFields.has(raw.briefField as string)) issues.push(validationIssue("invalid_brief_field", "critic_schema", `${base}.briefField`));
      const target = isText(raw.targetRef) ? resolveCriticTargetRef(draft, raw.targetRef) : null;
      if (!target) {
        const invalid = validationIssue("invalid_target_ref", "critic_target", `${base}.targetRef`);
        if (isText(raw.targetRef) && raw.targetRef.length <= 200 && /^[A-Za-z0-9:_%.\-]+$/.test(raw.targetRef)) invalid.rejectedTargetRef = raw.targetRef;
        issues.push(invalid);
      }
      else normalizedIssues.push({ ...(raw as Omit<CriticIssue, "target">), targetRef: raw.targetRef as string, target } as CriticIssue);
    });
    if (parsed.verdict === "pass" && parsed.issues.some((item) => isRecord(item) && item.severity !== "minor")) issues.push(validationIssue("pass_has_blocking_issue", "critic_schema", "verdict"));
    if (!issues.length) {
      const languageFields = [
        ...(isText(parsed.summary) ? [{ path: "summary", text: parsed.summary }] : []),
        ...normalizedIssues.flatMap((item, index) => [
          { path: `issues.${index}.message`, text: item.message },
          { path: `issues.${index}.rewriteInstruction`, text: item.rewriteInstruction },
        ]),
      ];
      for (const mismatch of validateInternalCreativeLanguage(languageFields, "zh-CN")) issues.push(validationIssue(mismatch.code, "critic_language", mismatch.path));
    }
    if (!issues.length) parsed.issues = normalizedIssues;
  }
  return issues.length ? { value: null, issues } : { value: structuredClone(parsed as ScriptCriticResult), issues: [] };
}

export type ResolvedCriticTarget = { path: string; value: string };

export function resolveCriticTarget(draft: ScriptDraftV2, target: CriticIssueTarget): ResolvedCriticTarget | null {
  if (!fieldsByScope[target.scope]?.has(target.field)) return null;
  if (target.scope !== "scene" && "sceneId" in target && target.sceneId !== undefined) return null;
  if (target.scope === "title") return { path: "title", value: draft.title };
  if (target.scope === "hook") return { path: `hook.${target.field}`, value: draft.hook[target.field] };
  if (target.scope === "narration") return { path: "fullNarration", value: draft.fullNarration };
  if (target.scope === "cta") return { path: "cta", value: draft.cta };
  const index = draft.scenes.findIndex((scene) => scene.id === target.sceneId);
  if (index < 0) return null;
  const value = draft.scenes[index][target.field];
  return typeof value === "string" ? { path: `scenes.${index}.${target.field}`, value } : null;
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
  "Write every issue message, rewriteInstruction, and summary in Simplified Chinese. Review the Chinese source Script; do not evaluate future target-language localization quality.",
  "For targetRef, select one exact value from the supplied targetCatalog. Do not invent aliases, semantic synonyms, field names, or scene IDs.",
  "For briefField, use one exact value from the supplied allowedBriefFields list, or omit briefField when the issue is not tied to one locked Brief decision. Never invent aliases or alternate naming.",
  "A pass requires no critical or major quality issue. Structural validity alone is not a pass: reject generic, repetitive, brochure-like, incoherent, unshootable, or weakly evidenced execution.",
  "Return exactly one JSON object containing verdict, at most 8 actionable issues, and an optional summary. Use only the supplied stable issue codes, severities, targets, and existing scene IDs.",
].join(" ");

export const SCRIPT_CRITIC_ISSUE_CODE_CATALOG: Record<BriefAwareCriticIssueCode, string> = {
  brief_angle_drift: "The script executes a different creative angle from the locked Brief.",
  hook_intent_drift: "The hook changes the locked hook intent or strategy.",
  opening_visual_mismatch: "The opening visual does not execute the locked opening visual.",
  evidence_strategy_drift: "The evidence scene uses a different proof strategy from the locked Brief.",
  cta_direction_drift: "The CTA changes the locked CTA direction.",
  ugc_advertising_tone: "The wording sounds like a brand advertisement, slogan, brochure, or sales pitch rather than a real creator.",
  ugc_unnatural_dialogue: "The spoken Chinese is difficult to say naturally or uses formal, translated, or non-conversational phrasing.",
  ugc_overwritten: "The copy is overexplained, adjective-heavy, or says what the viewer can already see.",
  ugc_repetitive: "Multiple lines repeat the same point without advancing the script.",
  unsupported_causal_claim: "The script states or implies an unsupported product-caused outcome.",
  evidence_dialogue_mismatch: "The dialogue claims more or something different from the visible evidence.",
  unobservable_claim: "The claimed proof cannot be observed in the described visual or action.",
  visual_action_mismatch: "The visual, action, and dialogue do not describe one coherent beat.",
  weak_hook_execution: "The first spoken beat is generic, delayed, vague, or lacks a concrete reason to keep watching.",
  hook_visual_disconnect: "The hook line and opening visual do not reinforce the same immediate idea.",
  scene_redundancy: "A scene repeats the job or information of another scene.",
  scene_filler: "A scene adds no necessary story, evidence, product, or CTA function.",
  scene_not_filmmable: "The scene depends on an abstract, unsafe, unavailable, or unspecified action that cannot be shot as written.",
  scene_pacing_issue: "The scene order, duration, or information density makes the short-form script drag or rush.",
  cta_too_hard: "The CTA is abrupt, pushy, or disconnected from the preceding experience.",
  cta_unsupported_claim: "The CTA introduces a product or commercial claim not supported by canonical Product Truth.",
};

export const SCRIPT_CRITIC_QUALITY_RUBRIC = [
  "Judge the first two seconds: hook line and opening visual must create one immediate, specific viewing reason.",
  "Judge spoken Chinese aloud: concise, conversational, and creator-like; flag slogans, brochure phrases, stacked adjectives, and formal transitions.",
  "Judge progression: each scene must perform a distinct job and advance one coherent creative idea without feature-listing or repetition.",
  "Judge evidence: the viewer must be able to see the proof action, and dialogue cannot claim more than the visual demonstrates or Product Truth supports.",
  "Judge filmability and coherence: visual, action, dialogue, duration, and scene order must be practically shootable and mutually consistent.",
  "Judge CTA as the natural final beat of the locked direction, without abrupt pressure or new claims.",
] as const;

const outputContract = {
  verdict: "pass | needs_rewrite",
  issues: [{
    code: CRITIC_ISSUE_CODE_VALUES, severity: "critical | major | minor",
    targetRef: "one exact targetRef from targetCatalog",
    message: "concise Chinese diagnosis", rewriteInstruction: "Chinese correction instruction, not replacement copy", deterministic: false,
    briefField: { optional: true, allowedValues: CRITIC_BRIEF_FIELD_VALUES, instruction: "use one exact value or omit" },
  }],
  summary: "optional concise summary",
};

const fieldOnlyRepairCodes = new Set(["invalid_issue_code", "invalid_target_ref", "invalid_brief_field", "internal_language_mismatch"]);

function parseCriticJson(content: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""));
    return isRecord(parsed) ? parsed : null;
  } catch { return null; }
}

function safeCriticRepairCandidate(content: string, repairIssues: ScriptCriticValidationIssue[] = []) {
  const parsed = parseCriticJson(content);
  if (!parsed || !Array.isArray(parsed.issues) || parsed.issues.length > SCRIPT_CRITIC_BUDGET.maximumIssues) return null;
  const candidate: Record<string, unknown> = {};
  for (const key of topFields) {
    if (key === "issues" || parsed[key] === undefined) continue;
    if (typeof parsed[key] === "string") candidate[key] = parsed[key];
  }
  candidate.issues = parsed.issues.map((value) => {
    if (!isRecord(value)) return null;
    const issue: Record<string, unknown> = {};
    for (const key of issueFields) {
      if (typeof value[key] === "string" || typeof value[key] === "boolean") issue[key] = value[key];
    }
    return issue;
  });
  const candidateIssues = candidate.issues as Array<Record<string, unknown> | null>;
  for (const issue of repairIssues) {
    const match = issue.path?.match(/^issues\.(\d+)\.(code|targetRef|briefField)$/);
    if (!match) continue;
    const target = candidateIssues[Number(match[1])];
    if (!target) continue;
    if (match[2] === "code") target.code = issue.rejectedIssueCode || "invalid_issue_code_value";
    if (match[2] === "targetRef") target.targetRef = issue.rejectedTargetRef || "INVALID_TARGET_REF";
    if (match[2] === "briefField") delete target.briefField;
  }
  return candidate;
}

function applyFieldOnlyCriticRepair(initialContent: string, repairedContent: string, repairIssues: ScriptCriticValidationIssue[]) {
  const initial = safeCriticRepairCandidate(initialContent);
  const repaired = parseCriticJson(repairedContent);
  if (!initial || !repaired || !Array.isArray(initial.issues) || !Array.isArray(repaired.issues)) return null;
  const merged = structuredClone(initial);
  const mergedIssues = merged.issues as Array<Record<string, unknown> | null>;
  for (const issue of repairIssues) {
    if (!issue.path) return null;
    if (issue.code === "internal_language_mismatch" && issue.path === "summary") {
      if (!isText(repaired.summary)) return null;
      merged.summary = repaired.summary;
      continue;
    }
    const match = issue.path.match(/^issues\.(\d+)\.(code|targetRef|briefField|message|rewriteInstruction)$/);
    if (!match) return null;
    const index = Number(match[1]);
    const field = match[2];
    const sourceIssue = repaired.issues[index];
    const targetIssue = mergedIssues[index];
    if (!isRecord(sourceIssue) || !targetIssue) return null;
    if (issue.code === "invalid_brief_field" && field === "briefField" && sourceIssue.briefField === undefined) {
      delete targetIssue.briefField;
      continue;
    }
    if (!isText(sourceIssue[field])) return null;
    targetIssue[field] = sourceIssue[field];
  }
  return JSON.stringify(merged);
}

export function buildScriptCriticMessages(input: ScriptCriticInput, repairIssues: ScriptCriticValidationIssue[] = [], initialCritiqueContent?: string) {
  const targetCatalog = buildCriticReviewTargetCatalog(input.scriptDraft).map(({ targetRef, path }) => ({ targetRef, path }));
  const originalCritique = initialCritiqueContent ? safeCriticRepairCandidate(initialCritiqueContent, repairIssues) : null;
  const repair = repairIssues.length ? {
    instruction: "Copy originalCritique exactly, then correct only the exact fields listed in issues. For invalid_issue_code, replace only the code at that exact path with the semantically closest exact allowedIssueCodes value. For invalid_target_ref, replace only targetRef with one exact supplied targetCatalog value. For invalid_brief_field, use one exact allowedBriefFields value or omit it. For internal_language_mismatch, re-express only the indicated message, rewriteInstruction, or summary in Simplified Chinese. Preserve issue count, order, code, severity, critique meaning, message, rewriteInstruction, targetRef, briefField, deterministic flag, verdict, summary, Brief relationship, and every already-valid field, except the exact field explicitly marked invalid. Do not add, remove, merge, reinterpret, or re-evaluate issues. Do not rewrite the Script, Brief, or Product Truth.",
    issues: repairIssues.map(({ code, path, stage, rejectedTargetRef, rejectedIssueCode }) => ({ code, ...(path ? { path } : {}), stage, ...(rejectedTargetRef ? { rejectedTargetRef } : {}), ...(rejectedIssueCode ? { rejectedIssueCode } : {}) })),
    ...(originalCritique ? { originalCritique } : {}),
    targetCatalog,
    allowedBriefFields: CRITIC_BRIEF_FIELD_VALUES,
    allowedIssueCodes: CRITIC_ISSUE_CODE_VALUES,
  } : undefined;
  return [
    { role: "system" as const, content: SCRIPT_CRITIC_SYSTEM_PROMPT },
    { role: "user" as const, content: JSON.stringify({
      task: "Critique this draft against its locked Creative Brief without rewriting it",
      lockedCreativeBrief: deriveBriefLockedDecisions(input.creativeBrief),
      canonicalProductTruth: compactProductTruth(input),
      languageContext: resolveScriptWriterLanguageContext(writerInput(input)),
      scriptDraft: input.scriptDraft,
      targetCatalog,
      allowedBriefFields: CRITIC_BRIEF_FIELD_VALUES,
      issueCodeCatalog: SCRIPT_CRITIC_ISSUE_CODE_CATALOG,
      qualityRubric: SCRIPT_CRITIC_QUALITY_RUBRIC,
      outputContract,
      ...(repair ? { repair } : {}),
    }) },
  ];
}

type MutableCriticAddresses = { code: Set<number>; targetRef: Set<number>; briefField: Set<number> };
const noMutableCriticAddresses = (): MutableCriticAddresses => ({ code: new Set(), targetRef: new Set(), briefField: new Set() });

function repairSemanticSignature(content: string, includeLanguageText = true, mutable = noMutableCriticAddresses()) {
  try {
    const parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""));
    if (!isRecord(parsed) || !Array.isArray(parsed.issues)) return null;
    const signatureIssues = parsed.issues.map((item, index) => {
      if (!isRecord(item)) return null;
      return {
        ...(!mutable.code.has(index) ? { code: item.code } : {}),
        severity: item.severity,
        ...(!mutable.targetRef.has(index) ? { targetRef: item.targetRef } : {}),
        ...(!mutable.briefField.has(index) ? { briefField: item.briefField } : {}),
        ...(includeLanguageText ? { message: item.message, rewriteInstruction: item.rewriteInstruction } : {}),
        deterministic: item.deterministic,
      };
    });
    if (signatureIssues.some((item) => item === null)) return null;
    return JSON.stringify({ verdict: parsed.verdict, ...(includeLanguageText ? { summary: parsed.summary } : {}), issues: signatureIssues });
  } catch { return null; }
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
  let repairSignature: string | null = null;
  let repairSourceContent: string | null = null;
  let fieldOnlyRepair = false;
  let mutableAddresses = noMutableCriticAddresses();
  let languageRepair = false;
  for (let attempt = 0; attempt < SCRIPT_CRITIC_BUDGET.maximumProviderAttempts; attempt++) {
    let response: ScriptCriticProviderResponse;
    try {
      response = await provider({
        messages: buildScriptCriticMessages(input, parseIssues, repairSourceContent || undefined),
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
    const projectedRepair = attempt > 0 && fieldOnlyRepair && repairSourceContent
      ? applyFieldOnlyCriticRepair(repairSourceContent, response.content, parseIssues)
      : null;
    const parsedContent = projectedRepair || response.content;
    const parsed = parseScriptCriticResult(parsedContent, input.scriptDraft);
    if (parsed.value) {
      if (attempt > 0 && !projectedRepair && repairSignature && repairSemanticSignature(response.content, !languageRepair, mutableAddresses) !== repairSignature) {
        parseIssues = [validationIssue("repair_changed_critique", "critic_schema", "issues")];
        options.observe?.({ correlationId, attempt: attempt + 1, stage: "critic_schema", provider: response.providerUsed, model: response.model, latencyMs: response.responseTimeMs, repairAttempted: resultMetadata.repairAttempted, issueCount: 1, issues: parseIssues });
        continue;
      }
      options.observe?.({ correlationId, attempt: attempt + 1, stage: "completed", provider: response.providerUsed, model: response.model, latencyMs: resultMetadata.latencyMs, repairAttempted: resultMetadata.repairAttempted, issueCount: parsed.value.issues.length, errorType: null });
      return { status: "success", critique: parsed.value, metadata: resultMetadata, validationIssues: [] };
    }
    parseIssues = parsed.issues;
    if (attempt === 0) {
      repairSourceContent = response.content;
      fieldOnlyRepair = parseIssues.length > 0 && parseIssues.every((item) => fieldOnlyRepairCodes.has(item.code));
      languageRepair = parseIssues.some((item) => item.stage === "critic_language");
      const indexesFor = (code: string, field: string) => new Set(parseIssues.filter((item) => item.code === code).map((item) => Number(item.path?.match(new RegExp(`^issues\\.(\\d+)\\.${field}$`))?.[1])).filter(Number.isInteger));
      mutableAddresses = {
        code: indexesFor("invalid_issue_code", "code"),
        targetRef: indexesFor("invalid_target_ref", "targetRef"),
        briefField: indexesFor("invalid_brief_field", "briefField"),
      };
      repairSignature = repairSemanticSignature(response.content, !languageRepair, mutableAddresses);
    }
    const stage = parseIssues[0]?.stage || "critic_schema";
    options.observe?.({ correlationId, attempt: attempt + 1, stage, provider: response.providerUsed, model: response.model, latencyMs: response.responseTimeMs, repairAttempted: resultMetadata.repairAttempted, issueCount: parseIssues.length, issues: parseIssues });
    if (attempt === 0) { resultMetadata.repairAttempted = true; continue; }
  }
  resultMetadata.errorType = "repair_failed";
  options.observe?.({ correlationId, attempt: SCRIPT_CRITIC_BUDGET.maximumProviderAttempts, stage: "repair_failed", provider: resultMetadata.providerUsed, model: resultMetadata.model, latencyMs: resultMetadata.latencyMs, repairAttempted: true, issueCount: parseIssues.length, issues: parseIssues, errorType: resultMetadata.errorType });
  return { status: "failure", critique: null, metadata: resultMetadata, validationIssues: parseIssues };
}
