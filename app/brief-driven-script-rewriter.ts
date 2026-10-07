import {
  adaptScriptDraftToStructuredScript,
  CRITIC_BRIEF_FIELD_VALUES,
  CRITIC_ISSUE_CODE_VALUES,
  deriveBriefLockedDecisions,
  parseScriptDraftV2,
  validateScriptDraftDeterministically,
  type BriefAwareCriticIssueCode,
  type CriticBriefField,
  type CriticIssue,
  type CriticIssueTarget,
  type ScriptDraftV2,
  type ScriptWriterInput,
  type ScriptWriterValidationIssue,
} from "./brief-driven-script";
import {
  resolveCriticTarget,
  resolveCriticTargetRef,
} from "./brief-driven-script-critic";
import { validateBriefDrivenWriterInput } from "./brief-driven-script-writer";
import { createScriptRevisionId } from "./script-foundation";
import type { StructuredScript } from "./script-generation";
import type { ProviderErrorType, ProviderId } from "./provider-types";
import type { CreationLanguageContext } from "./creation-language-context";

export type AuthorizedRewriteIssue = {
  patchId: string;
  sourceScriptRevisionId: string;
  targetRef: string;
  resolvedTarget: CriticIssueTarget;
  expectedCurrentValue: string;
  issueCode: BriefAwareCriticIssueCode;
  severity: CriticIssue["severity"];
  message: string;
  rewriteInstruction: string;
  briefField?: CriticBriefField;
};

export type TargetedRewriteInput = ScriptWriterInput & {
  languageContext: CreationLanguageContext;
  sourceScriptRevisionId: string;
  currentDraft: ScriptDraftV2;
  issues: AuthorizedRewriteIssue[];
};

export type TargetedRewriteProviderRequest = {
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  topP: number;
  maxTokens: number;
  timeoutMs: number;
};

export type TargetedRewriteProviderResponse = {
  content: string;
  providerRequested: ProviderId;
  providerUsed: ProviderId;
  model: string | null;
  responseTimeMs: number;
};

export type TargetedRewriteProvider = (request: TargetedRewriteProviderRequest) => Promise<TargetedRewriteProviderResponse>;
export type TargetedRewriteErrorType = ProviderErrorType | "invalid_input" | "invalid_output" | "validation_failed" | "stale_source";
export type TargetedRewriteMetadata = {
  projectId: string;
  providerRequested: ProviderId | null;
  providerUsed: ProviderId | null;
  model: string | null;
  latencyMs: number | null;
  providerCalls: number;
  fallbackUsed: false;
  errorType: TargetedRewriteErrorType | null;
  sourceScriptRevisionId: string;
  scriptRevisionId: string | null;
  sourceCreativeBriefId: string;
  sourceCreativeBriefRevisionId: string;
  productContextFingerprint: string;
};
export type TargetedRewriteResult = {
  status: "success" | "failure";
  draft: ScriptDraftV2 | null;
  script: (StructuredScript & { revisionId: string; sourceCreativeBriefId: string; sourceCreativeBriefRevisionId: string }) | null;
  metadata: TargetedRewriteMetadata;
  issues: ScriptWriterValidationIssue[];
};

export const TARGETED_REWRITE_BUDGET = { providerTimeoutMs: 45_000, maxTokens: 1_600, temperature: 0.2, topP: 0.85, maximumProviderAttempts: 1 } as const;
const issue = (code: string, path?: string): ScriptWriterValidationIssue => ({ code, ...(path ? { path } : {}), stage: "targeted_rewrite", validator: "validateTargetedRewriteInput" });
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
const targetKey = (target: CriticIssueTarget) => JSON.stringify(target);
const criticCodes = new Set<string>(CRITIC_ISSUE_CODE_VALUES);
const criticSeverities = new Set(["critical", "major", "minor"]);
const briefFields = new Set<string>(CRITIC_BRIEF_FIELD_VALUES);

function writerInput(input: TargetedRewriteInput): ScriptWriterInput {
  const { sourceScriptRevisionId: _source, currentDraft: _draft, issues: _issues, ...writer } = input;
  return writer;
}

export function validateTargetedRewriteInput(input: TargetedRewriteInput): ScriptWriterValidationIssue[] {
  if (!record(input)) return [issue("invalid_input")];
  const issues = validateBriefDrivenWriterInput(writerInput(input));
  if (!text(input.sourceScriptRevisionId)) issues.push(issue("missing_source_revision", "sourceScriptRevisionId"));
  const parsed = parseScriptDraftV2(JSON.stringify(input.currentDraft), { requireCanonicalLanguage: true });
  if (!parsed.value) issues.push(...parsed.issues);
  else issues.push(...validateScriptDraftDeterministically(writerInput(input), parsed.value));
  if (!Array.isArray(input.issues) || !input.issues.length) issues.push(issue("missing_rewrite_issues", "issues"));
  else if (input.issues.length > 8) issues.push(issue("too_many_rewrite_issues", "issues"));
  else input.issues.forEach((item, index) => {
    const base = `issues.${index}`;
    if (!record(item)) { issues.push(issue("invalid_rewrite_issue", base)); return; }
    if (!text(item.patchId)) issues.push(issue("missing_patch_id", `${base}.patchId`));
    else if (item.patchId.length > 100) issues.push(issue("invalid_patch_id", `${base}.patchId`));
    if (item.sourceScriptRevisionId !== input.sourceScriptRevisionId) issues.push(issue("stale_source_revision", `${base}.sourceScriptRevisionId`));
    if (!criticCodes.has(item.issueCode)) issues.push(issue("invalid_issue_code", `${base}.issueCode`));
    if (!criticSeverities.has(item.severity)) issues.push(issue("invalid_severity", `${base}.severity`));
    if (item.briefField !== undefined && !briefFields.has(item.briefField)) issues.push(issue("invalid_brief_field", `${base}.briefField`));
    if (!text(item.targetRef)) { issues.push(issue("invalid_target_ref", `${base}.targetRef`)); return; }
    const resolved = resolveCriticTargetRef(input.currentDraft, item.targetRef);
    if (!resolved) { issues.push(issue("invalid_target_ref", `${base}.targetRef`)); return; }
    if (targetKey(resolved) !== targetKey(item.resolvedTarget)) issues.push(issue("resolved_target_mismatch", `${base}.resolvedTarget`));
    const current = resolveCriticTarget(input.currentDraft, resolved);
    if (!current || current.value !== item.expectedCurrentValue) issues.push(issue("stale_target_value", `${base}.expectedCurrentValue`));
    if (!text(item.rewriteInstruction) || !text(item.message)) issues.push(issue("invalid_rewrite_instruction", base));
  });
  const patchIds = new Set<string>();
  for (const [index, item] of (input.issues || []).entries()) {
    if (patchIds.has(item.patchId)) issues.push(issue("duplicate_patch_id", `issues.${index}.patchId`));
    patchIds.add(item.patchId);
  }
  return issues.filter((item, index, all) => index === all.findIndex((other) => other.code === item.code && other.path === item.path));
}

export type NormalizedRewritePatch = AuthorizedRewriteIssue & { resolvedTarget: CriticIssueTarget };

export function normalizeAuthorizedRewriteIssues(input: TargetedRewriteInput): { patches: NormalizedRewritePatch[]; issues: ScriptWriterValidationIssue[] } {
  const validation = validateTargetedRewriteInput(input);
  if (validation.length) return { patches: [], issues: validation };
  const byTarget = new Map<string, NormalizedRewritePatch>();
  for (const item of input.issues) {
    const resolved = resolveCriticTargetRef(input.currentDraft, item.targetRef)!;
    const key = targetKey(resolved);
    const previous = byTarget.get(key);
    if (!previous) { byTarget.set(key, { ...item, resolvedTarget: resolved }); continue; }
    const compatible = previous.issueCode === item.issueCode && previous.severity === item.severity && previous.message === item.message && previous.rewriteInstruction === item.rewriteInstruction && previous.briefField === item.briefField && previous.expectedCurrentValue === item.expectedCurrentValue;
    if (!compatible) return { patches: [], issues: [issue("conflicting_target_instructions", item.targetRef)] };
  }
  return { patches: [...byTarget.values()], issues: [] };
}

const productTruth = (input: TargetedRewriteInput) => ({
  productName: input.productContext.productName,
  facts: input.productContext.productKnowledge?.notes || "",
  sellingPoints: input.productContext.productKnowledge?.sellingPoints || "",
  parameters: input.productContext.productKnowledge?.parameters || "",
  forbiddenClaims: input.productContext.productKnowledge?.bannedWords || "",
});

export const TARGETED_REWRITE_SYSTEM_PROMPT = [
  "You perform a constrained local rewrite of a canonical Chinese source Script.",
  "The supplied patch IDs and targets are authorized by ViralFlow. Return replacement text only; never choose or return an address.",
  "Treat Canonical Product Truth as a closed-world factual boundary: a product fact or commercial promise is allowed only when it is explicitly present there.",
  "Never introduce or strengthen prices, promotions, coupons, gifts, delivery promises, inventory or ranking claims, warranties, guarantees, certifications, endorsements, or numeric parameters that Canonical Product Truth does not state.",
  "When an instruction can be satisfied only by inventing a product fact, preserve the supported meaning and improve expression without adding that fact. Never relocate an unsupported claim to another replacement.",
  "Preserve the locked Creative Brief, Product Truth, meaning outside each instruction, and Simplified Chinese source language.",
  "Do not return targetRef, path, scope, sceneId, field, Script, ScriptDraftV2, identities, Product Truth, Creative Angle, explanations, or Markdown.",
  "Return exactly one JSON object with replacements; each item contains only patchId and replacementValue.",
].join(" ");

export function buildTargetedRewriteMessages(input: TargetedRewriteInput, patches: NormalizedRewritePatch[]) {
  return [
    { role: "system" as const, content: TARGETED_REWRITE_SYSTEM_PROMPT },
    { role: "user" as const, content: JSON.stringify({
      task: "Rewrite only the authorized Script fields",
      lockedCreativeBrief: deriveBriefLockedDecisions(input.creativeBrief),
      canonicalProductTruth: productTruth(input),
      productTruthPolicy: {
        boundary: "closed_world",
        rule: "Every product capability, result, commercial promise, certification, endorsement, and numeric parameter in a replacement must be explicitly supported by canonicalProductTruth.",
        prohibitedUnlessExplicitlySupported: ["price", "promotion", "coupon", "gift", "free shipping or delivery", "inventory or ranking", "warranty or guarantee", "certification or endorsement", "numeric parameter"],
        safeRewriteBehavior: "Keep the existing supported fact and improve only the requested expression. Do not add, strengthen, or relocate an unsupported claim.",
      },
      languageContext: input.languageContext,
      authorizedPatches: patches.map(({ patchId, targetRef, expectedCurrentValue, issueCode, severity, message, rewriteInstruction, briefField }) => ({ patchId, targetRef, currentValue: expectedCurrentValue, issueCode, severity, message, rewriteInstruction, ...(briefField ? { briefField } : {}) })),
      outputContract: { replacements: [{ patchId: "exact supplied patchId", replacementValue: "replacement string only" }] },
    }) },
  ];
}

export type ParsedReplacement = { patchId: string; replacementValue: string };
export function parseTargetedRewriteOutput(content: string, patches: NormalizedRewritePatch[]): { value: ParsedReplacement[] | null; issues: ScriptWriterValidationIssue[] } {
  let parsed: unknown;
  try { parsed = JSON.parse(content.trim()); } catch { return { value: null, issues: [issue("invalid_json")] }; }
  if (!record(parsed) || Object.keys(parsed).some((key) => key !== "replacements") || !Array.isArray(parsed.replacements)) return { value: null, issues: [issue("invalid_output_contract")] };
  const allowed = new Set(patches.map((patch) => patch.patchId));
  const seen = new Set<string>();
  const output: ParsedReplacement[] = [];
  const issues: ScriptWriterValidationIssue[] = [];
  parsed.replacements.forEach((item, index) => {
    const path = `replacements.${index}`;
    if (!record(item) || Object.keys(item).some((key) => key !== "patchId" && key !== "replacementValue")) { issues.push(issue("unexpected_replacement_field", path)); return; }
    if (!text(item.patchId) || !allowed.has(item.patchId)) issues.push(issue("unknown_patch_id", `${path}.patchId`));
    else if (seen.has(item.patchId)) issues.push(issue("duplicate_patch_id", `${path}.patchId`));
    if (!text(item.replacementValue)) issues.push(issue("blank_replacement", `${path}.replacementValue`));
    if (text(item.patchId) && text(item.replacementValue)) { seen.add(item.patchId); output.push({ patchId: item.patchId, replacementValue: item.replacementValue.trim() }); }
  });
  for (const patch of patches) if (!seen.has(patch.patchId)) issues.push(issue("missing_patch_id", patch.patchId));
  if (parsed.replacements.length !== patches.length) issues.push(issue("replacement_count_mismatch", "replacements"));
  return issues.length ? { value: null, issues } : { value: output, issues: [] };
}

function setTarget(draft: ScriptDraftV2, target: CriticIssueTarget, replacement: string) {
  if (target.scope === "title") draft.title = replacement;
  else if (target.scope === "hook") draft.hook[target.field] = replacement;
  else if (target.scope === "narration") draft.fullNarration = replacement;
  else if (target.scope === "cta") draft.cta = replacement;
  else {
    const scene = draft.scenes.find((item) => item.id === target.sceneId);
    if (!scene) throw new Error("stale_target");
    scene[target.field] = replacement;
  }
}

function leafChanges(before: unknown, after: unknown, path = ""): string[] {
  if (Object.is(before, after)) return [];
  if (!record(before) || !record(after)) {
    if (Array.isArray(before) && Array.isArray(after)) {
      if (before.length !== after.length) return [path];
      return before.flatMap((item, index) => leafChanges(item, after[index], path ? `${path}.${index}` : String(index)));
    }
    return [path];
  }
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].flatMap((key) => leafChanges(before[key], after[key], path ? `${path}.${key}` : key));
}

export function applyTargetedRewrite(input: TargetedRewriteInput, patches: NormalizedRewritePatch[], replacements: ParsedReplacement[]): { draft: ScriptDraftV2 | null; issues: ScriptWriterValidationIssue[] } {
  const currentIssues = validateTargetedRewriteInput(input);
  if (currentIssues.length) return { draft: null, issues: currentIssues };
  const replacementMap = new Map(replacements.map((item) => [item.patchId, item.replacementValue]));
  const clone = structuredClone(input.currentDraft);
  const allowedPaths = new Set<string>();
  for (const patch of patches) {
    const resolved = resolveCriticTargetRef(input.currentDraft, patch.targetRef);
    if (!resolved || targetKey(resolved) !== targetKey(patch.resolvedTarget)) return { draft: null, issues: [issue("stale_target", patch.targetRef)] };
    const current = resolveCriticTarget(input.currentDraft, resolved);
    if (!current || current.value !== patch.expectedCurrentValue) return { draft: null, issues: [issue("stale_target_value", patch.targetRef)] };
    const replacement = replacementMap.get(patch.patchId);
    if (!replacement) return { draft: null, issues: [issue("missing_patch_id", patch.patchId)] };
    allowedPaths.add(current.path);
    setTarget(clone, resolved, replacement);
  }
  const unauthorized = leafChanges(input.currentDraft, clone).filter((path) => !allowedPaths.has(path));
  if (unauthorized.length) return { draft: null, issues: unauthorized.map((path) => issue("unauthorized_mutation", path)) };
  const parsed = parseScriptDraftV2(JSON.stringify(clone), { requireCanonicalLanguage: true });
  if (!parsed.value) return { draft: null, issues: parsed.issues };
  const validation = validateScriptDraftDeterministically(writerInput(input), parsed.value);
  return validation.length ? { draft: null, issues: validation } : { draft: parsed.value, issues: [] };
}

function errorType(error: unknown): TargetedRewriteErrorType {
  if (error && typeof error === "object" && "category" in error) return (error as { category: ProviderErrorType }).category;
  return "invalid_output";
}

export async function generateTargetedScriptRewrite(input: TargetedRewriteInput, provider: TargetedRewriteProvider, options: { providerIdentity?: { providerRequested: ProviderId; providerUsed: ProviderId; model: string | null } } = {}): Promise<TargetedRewriteResult> {
  const metadata: TargetedRewriteMetadata = {
    projectId: input.projectId || "",
    providerRequested: options.providerIdentity?.providerRequested || null,
    providerUsed: options.providerIdentity?.providerUsed || null,
    model: options.providerIdentity?.model || null,
    latencyMs: null,
    providerCalls: 0,
    fallbackUsed: false,
    errorType: null,
    sourceScriptRevisionId: input.sourceScriptRevisionId || "",
    scriptRevisionId: null,
    sourceCreativeBriefId: input.creativeBriefReference?.id || "",
    sourceCreativeBriefRevisionId: input.creativeBriefReference?.revisionId || "",
    productContextFingerprint: input.productContextFingerprint || "",
  };
  const normalized = normalizeAuthorizedRewriteIssues(input);
  if (normalized.issues.length) {
    metadata.errorType = normalized.issues.some((item) => item.code.startsWith("stale_") || item.code === "resolved_target_mismatch") ? "stale_source" : "invalid_input";
    return { status: "failure", draft: null, script: null, metadata, issues: normalized.issues };
  }
  let response: TargetedRewriteProviderResponse;
  try {
    metadata.providerCalls = 1;
    response = await provider({ messages: buildTargetedRewriteMessages(input, normalized.patches), temperature: TARGETED_REWRITE_BUDGET.temperature, topP: TARGETED_REWRITE_BUDGET.topP, maxTokens: TARGETED_REWRITE_BUDGET.maxTokens, timeoutMs: TARGETED_REWRITE_BUDGET.providerTimeoutMs });
  } catch (error) {
    metadata.errorType = errorType(error);
    return { status: "failure", draft: null, script: null, metadata, issues: [] };
  }
  Object.assign(metadata, { providerRequested: response.providerRequested, providerUsed: response.providerUsed, model: response.model, latencyMs: response.responseTimeMs });
  const parsed = parseTargetedRewriteOutput(response.content, normalized.patches);
  if (!parsed.value) { metadata.errorType = "invalid_output"; return { status: "failure", draft: null, script: null, metadata, issues: parsed.issues }; }
  const applied = applyTargetedRewrite(input, normalized.patches, parsed.value);
  if (!applied.draft) { metadata.errorType = applied.issues.some((item) => item.code.startsWith("stale_")) ? "stale_source" : "validation_failed"; return { status: "failure", draft: null, script: null, metadata, issues: applied.issues }; }
  const revisionId = createScriptRevisionId();
  const script = adaptScriptDraftToStructuredScript(writerInput(input), applied.draft, revisionId);
  metadata.scriptRevisionId = revisionId;
  return { status: "success", draft: applied.draft, script, metadata, issues: [] };
}
