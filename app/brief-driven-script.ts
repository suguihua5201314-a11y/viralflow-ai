import type { CreativeBriefV2, EvidenceStrategy, OpeningVisual } from "./creative-contract";
import { productContextFingerprint } from "./creative-opportunity-selection";
import type { CanonicalProductContext } from "./product-context";
import { checkCompliance } from "./compliance-rules";
import { buildKnowledgeContext, findFactViolations } from "./knowledge-context";
import type { StructuredScript } from "./script-generation";
import { bindScriptToCreativeBrief, ensureScriptRevision } from "./script-foundation";
import { normalizeLanguageIdentity, validateScriptLanguage } from "./language-guard";

export type ScriptWriterInput = {
  projectId: string;
  requestId: string;
  creativeBriefReference: { id: string; revisionId: string };
  creativeBrief: CreativeBriefV2;
  productContext: CanonicalProductContext;
  productContextFingerprint: string;
  platform: string;
  market: string;
  language: string;
  preferences?: {
    durationSeconds?: number;
    creatorStyle?: string;
    spokenDensity?: "light" | "balanced" | "dense";
    toneSteering?: string;
    variantCount?: number;
  };
  recentScriptHistory?: Array<Pick<StructuredScript, "revisionId" | "title" | "hook" | "narration" | "creativeAngle" | "scenario" | "proofMechanism" | "cta" | "product" | "language">>;
};

export type BriefLockedDecisions = {
  targetAudience: string;
  useMoment: string;
  purchaseMotivation: string;
  tensionOrObjection?: string;
  creativeOpportunity: string;
  contentMechanisms: string[];
  creativeAngle: string;
  hookMechanism: string;
  hookLine: string;
  openingVisual: OpeningVisual;
  evidenceStrategy: EvidenceStrategy;
  ctaDirection: string;
  riskBoundaries: CreativeBriefV2["riskBoundaries"];
};

export type ScriptDraftScenePurpose = "hook" | "context" | "product" | "evidence" | "cta";

export type ScriptDraftScene = {
  id: string;
  purpose: ScriptDraftScenePurpose;
  visual: string;
  action: string;
  dialogue: string;
  durationHint?: number;
  evidenceRole?: string;
  briefTrace?: {
    executesOpeningVisual?: boolean;
    executesEvidence?: boolean;
    executesCTA?: boolean;
  };
};

export type ScriptDraftV2 = {
  title: string;
  hook: { line: string; openingVisualExecution: string };
  scenes: ScriptDraftScene[];
  fullNarration: string;
  cta: string;
  language: string;
  totalDurationHint?: number;
};

export type ScriptWriterValidationStage =
  | "input_identity"
  | "draft_parse"
  | "draft_schema"
  | "structural_fidelity"
  | "truth"
  | "compliance"
  | "numeric"
  | "targeted_rewrite";

export type ScriptWriterValidationIssue = {
  code: string;
  path?: string;
  stage: ScriptWriterValidationStage;
  validator: string;
};

export type CriticIssueCode =
  | "brief_hook_fidelity"
  | "opening_visual_missing"
  | "creative_angle_drift"
  | "content_mechanism_missing"
  | "evidence_missing"
  | "cta_drift"
  | "unsupported_claim"
  | "prohibited_claim"
  | "language"
  | "pacing"
  | "naturalness"
  | "repetition"
  | "feasibility"
  | "schema";

export type BriefAwareCriticIssueCode =
  | "brief_angle_drift"
  | "hook_intent_drift"
  | "opening_visual_mismatch"
  | "evidence_strategy_drift"
  | "cta_direction_drift"
  | "ugc_advertising_tone"
  | "ugc_unnatural_dialogue"
  | "ugc_overwritten"
  | "ugc_repetitive"
  | "unsupported_causal_claim"
  | "evidence_dialogue_mismatch"
  | "unobservable_claim"
  | "visual_action_mismatch"
  | "weak_hook_execution"
  | "hook_visual_disconnect"
  | "scene_redundancy"
  | "scene_filler"
  | "scene_not_filmmable"
  | "scene_pacing_issue"
  | "cta_too_hard"
  | "cta_unsupported_claim";

export type CriticIssueTarget = {
  scope: "title" | "hook" | "scene" | "cta" | "narration";
  sceneId?: string;
  field?: string;
};

export const CRITIC_BRIEF_FIELD_VALUES = [
  "opportunity.targetAudience",
  "opportunity.useMoment",
  "opportunity.purchaseMotivation",
  "opportunity.tensionOrObjection",
  "opportunity.creativeOpportunity",
  "direction.contentMechanisms",
  "direction.creativeAngle",
  "opening.hookMechanism",
  "opening.hookLine",
  "opening.visual",
  "truth",
  "evidence",
  "ctaDirection",
  "riskBoundaries",
] as const;

export type CriticBriefField = typeof CRITIC_BRIEF_FIELD_VALUES[number];

export type CriticIssue = {
  code: CriticIssueCode | BriefAwareCriticIssueCode;
  severity: "low" | "medium" | "high" | "minor" | "major" | "critical";
  target: CriticIssueTarget;
  message: string;
  rewriteInstruction: string;
  deterministic: boolean;
  briefField?: CriticBriefField;
};

export type TargetedRewrite = {
  changes: Array<{
    target: CriticIssueTarget;
    replacement: string;
  }>;
};

export type ParseScriptDraftResult = { value: ScriptDraftV2 | null; issues: ScriptWriterValidationIssue[] };

const purposes = new Set<ScriptDraftScenePurpose>(["hook", "context", "product", "evidence", "cta"]);
const topLevelFields = new Set(["title", "hook", "scenes", "fullNarration", "cta", "language", "totalDurationHint"]);
const hookFields = new Set(["line", "openingVisualExecution"]);
const sceneFields = new Set(["id", "purpose", "visual", "action", "dialogue", "durationHint", "evidenceRole", "briefTrace"]);
const traceFields = new Set(["executesOpeningVisual", "executesEvidence", "executesCTA"]);

const issue = (code: string, stage: ScriptWriterValidationStage, validator: string, path?: string): ScriptWriterValidationIssue =>
  ({ code, stage, validator, ...(path ? { path } : {}) });
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
const positiveDuration = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 && value <= 600;
const normalized = (value: string) => value.trim().normalize("NFKC").toLowerCase();
const split = (value?: string) => String(value || "").split(/[；;\n]+/).map((item) => item.trim()).filter(Boolean);

function unexpectedFields(value: Record<string, unknown>, allowed: Set<string>, basePath: string, issues: ScriptWriterValidationIssue[]) {
  for (const key of Object.keys(value)) if (!allowed.has(key)) issues.push(issue("unexpected_field", "draft_schema", "parseScriptDraftV2", basePath ? `${basePath}.${key}` : key));
}

function requiredText(value: unknown, path: string, issues: ScriptWriterValidationIssue[]) {
  if (value === undefined) issues.push(issue("missing_field", "draft_schema", "parseScriptDraftV2", path));
  else if (!text(value)) issues.push(issue("blank_or_invalid_string", "draft_schema", "parseScriptDraftV2", path));
}

export function deriveBriefLockedDecisions(brief: CreativeBriefV2): BriefLockedDecisions {
  return {
    targetAudience: brief.opportunity.targetAudience,
    useMoment: brief.opportunity.useMoment,
    purchaseMotivation: brief.opportunity.purchaseMotivation,
    tensionOrObjection: brief.opportunity.tensionOrObjection,
    creativeOpportunity: brief.opportunity.creativeOpportunity,
    contentMechanisms: [...brief.direction.contentMechanisms],
    creativeAngle: brief.direction.creativeAngle,
    hookMechanism: brief.opening.hookMechanism,
    hookLine: brief.opening.hookLine,
    openingVisual: structuredClone(brief.opening.visual),
    evidenceStrategy: structuredClone(brief.evidence),
    ctaDirection: brief.ctaDirection,
    riskBoundaries: structuredClone(brief.riskBoundaries),
  };
}

export function validateScriptWriterInput(input: ScriptWriterInput): ScriptWriterValidationIssue[] {
  const issues: ScriptWriterValidationIssue[] = [];
  const validator = "validateScriptWriterInput";
  if (input.projectId !== input.creativeBrief.projectId) issues.push(issue("foreign_project", "input_identity", validator, "projectId"));
  if (input.creativeBriefReference.id !== input.creativeBrief.id) issues.push(issue("brief_id_mismatch", "input_identity", validator, "creativeBriefReference.id"));
  if (input.creativeBriefReference.revisionId !== input.creativeBrief.revisionId) issues.push(issue("brief_revision_mismatch", "input_identity", validator, "creativeBriefReference.revisionId"));
  const actualFingerprint = productContextFingerprint(input.productContext);
  if (input.productContextFingerprint !== actualFingerprint) issues.push(issue("product_fingerprint_mismatch", "input_identity", validator, "productContextFingerprint"));
  if (input.creativeBrief.productReference.contextFingerprint !== actualFingerprint) issues.push(issue("brief_product_fingerprint_mismatch", "input_identity", validator, "creativeBrief.productReference.contextFingerprint"));
  if (normalized(input.creativeBrief.productReference.productName) !== normalized(input.productContext.productName)) issues.push(issue("brief_product_identity_mismatch", "input_identity", validator, "creativeBrief.productReference.productName"));
  const briefProfileId = input.creativeBrief.productReference.productProfileId;
  if (briefProfileId !== undefined && String(briefProfileId) !== String(input.productContext.profileId)) issues.push(issue("brief_product_profile_mismatch", "input_identity", validator, "creativeBrief.productReference.productProfileId"));
  return issues;
}

export function parseScriptDraftV2(content: string): ParseScriptDraftResult {
  let parsed: unknown;
  try { parsed = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")); }
  catch { return { value: null, issues: [issue("invalid_json", "draft_parse", "parseScriptDraftV2")] }; }
  if (!record(parsed)) return { value: null, issues: [issue("invalid_top_level", "draft_schema", "parseScriptDraftV2")] };
  const issues: ScriptWriterValidationIssue[] = [];
  unexpectedFields(parsed, topLevelFields, "", issues);
  requiredText(parsed.title, "title", issues);
  requiredText(parsed.fullNarration, "fullNarration", issues);
  requiredText(parsed.cta, "cta", issues);
  requiredText(parsed.language, "language", issues);
  if (parsed.totalDurationHint !== undefined && !positiveDuration(parsed.totalDurationHint)) issues.push(issue("invalid_duration", "draft_schema", "parseScriptDraftV2", "totalDurationHint"));

  if (!record(parsed.hook)) issues.push(issue(parsed.hook === undefined ? "missing_field" : "invalid_type", "draft_schema", "parseScriptDraftV2", "hook"));
  else {
    unexpectedFields(parsed.hook, hookFields, "hook", issues);
    requiredText(parsed.hook.line, "hook.line", issues);
    requiredText(parsed.hook.openingVisualExecution, "hook.openingVisualExecution", issues);
  }

  if (!Array.isArray(parsed.scenes)) issues.push(issue(parsed.scenes === undefined ? "missing_field" : "invalid_type", "draft_schema", "parseScriptDraftV2", "scenes"));
  else if (parsed.scenes.length === 0) issues.push(issue("empty_scenes", "draft_schema", "parseScriptDraftV2", "scenes"));
  else {
    const ids = new Set<string>();
    parsed.scenes.forEach((scene, index) => {
      const path = `scenes.${index}`;
      if (!record(scene)) { issues.push(issue("invalid_type", "draft_schema", "parseScriptDraftV2", path)); return; }
      unexpectedFields(scene, sceneFields, path, issues);
      for (const field of ["id", "visual", "action", "dialogue"] as const) requiredText(scene[field], `${path}.${field}`, issues);
      if (text(scene.id)) {
        if (ids.has(scene.id)) issues.push(issue("duplicate_scene_id", "draft_schema", "parseScriptDraftV2", `${path}.id`));
        ids.add(scene.id);
      }
      if (!purposes.has(scene.purpose as ScriptDraftScenePurpose)) issues.push(issue("invalid_scene_purpose", "draft_schema", "parseScriptDraftV2", `${path}.purpose`));
      if (scene.durationHint !== undefined && !positiveDuration(scene.durationHint)) issues.push(issue("invalid_duration", "draft_schema", "parseScriptDraftV2", `${path}.durationHint`));
      if (scene.evidenceRole !== undefined && !text(scene.evidenceRole)) issues.push(issue("blank_or_invalid_string", "draft_schema", "parseScriptDraftV2", `${path}.evidenceRole`));
      if (scene.briefTrace !== undefined) {
        if (!record(scene.briefTrace)) issues.push(issue("malformed_trace", "draft_schema", "parseScriptDraftV2", `${path}.briefTrace`));
        else {
          unexpectedFields(scene.briefTrace, traceFields, `${path}.briefTrace`, issues);
          for (const [key, value] of Object.entries(scene.briefTrace)) if (typeof value !== "boolean") issues.push(issue("malformed_trace", "draft_schema", "parseScriptDraftV2", `${path}.briefTrace.${key}`));
        }
      }
    });
  }
  return issues.length ? { value: null, issues } : { value: structuredClone(parsed as ScriptDraftV2), issues: [] };
}

export function collectScriptAssertionSurface(draft: ScriptDraftV2) {
  return [
    { path: "hook.line", text: draft.hook.line },
    ...draft.scenes.flatMap((scene, index) => [
      { path: `scenes.${index}.visual`, text: scene.visual },
      { path: `scenes.${index}.action`, text: scene.action },
      { path: `scenes.${index}.dialogue`, text: scene.dialogue },
    ]),
    { path: "fullNarration", text: draft.fullNarration },
    { path: "cta", text: draft.cta },
  ];
}

export function validateScriptDraftDeterministically(input: ScriptWriterInput, draft: ScriptDraftV2): ScriptWriterValidationIssue[] {
  const issues = [...validateScriptWriterInput(input)];
  const validator = "validateScriptDraftDeterministically";
  if (draft.scenes[0]?.purpose !== "hook") issues.push(issue("first_scene_must_be_hook", "structural_fidelity", validator, "scenes.0.purpose"));
  if (!draft.scenes[0]?.briefTrace?.executesOpeningVisual) issues.push(issue("opening_visual_trace_missing", "structural_fidelity", validator, "scenes.0.briefTrace.executesOpeningVisual"));
  if (input.creativeBrief.evidence.type !== "none-required" && !draft.scenes.some((scene) => scene.purpose === "evidence" && scene.briefTrace?.executesEvidence === true)) issues.push(issue("evidence_trace_missing", "structural_fidelity", validator, "scenes"));
  if (!draft.scenes.some((scene) => scene.purpose === "cta" && scene.briefTrace?.executesCTA === true)) issues.push(issue("cta_trace_missing", "structural_fidelity", validator, "scenes"));
  if (normalizeLanguageIdentity(draft.language) !== normalizeLanguageIdentity(input.language)) issues.push(issue("language_mismatch", "structural_fidelity", validator, "language"));
  const consumerLanguage = validateScriptLanguage({
    title: draft.title,
    hook: draft.hook.line,
    narration: draft.fullNarration,
    cta: draft.cta,
    scenes: draft.scenes.map((scene) => ({ line: scene.dialogue })),
  }, input.language);
  if (!consumerLanguage.passed) {
    for (const path of consumerLanguage.offendingFields) {
      const draftPath = path.startsWith("scenes.") ? path.replace(/\.line$/, ".dialogue") : path === "hook" ? "hook.line" : path === "narration" ? "fullNarration" : path;
      issues.push(issue("language_mismatch", "structural_fidelity", validator, draftPath));
    }
  }

  const knowledge = buildKnowledgeContext({
    product: input.productContext.productName,
    sellingPoints: input.productContext.productKnowledge?.sellingPoints || "",
    audience: input.creativeBrief.opportunity.targetAudience,
    country: input.market,
    language: input.language,
    platform: input.platform,
    offer: input.productContext.productKnowledge?.offer || "",
    productKnowledge: input.productContext.productKnowledge,
  });
  const banned = split(input.productContext.productKnowledge?.bannedWords);
  const factText = JSON.stringify(input.productContext).toLowerCase().replace(/\s/g, "");
  for (const assertion of collectScriptAssertionSurface(draft)) {
    for (const term of banned) if (assertion.text.toLowerCase().includes(term.toLowerCase())) issues.push(issue("prohibited_claim", "truth", validator, assertion.path));
    for (const hit of checkCompliance(assertion.text)) if (hit.level === "高") issues.push(issue("high_risk_compliance", "compliance", validator, assertion.path));
    for (const claim of assertion.text.match(/\d+(?:[.,]\d+)?\s*(?:%|°|mm\b|cm\b|mah\b|w\b)/gi) || []) {
      if (!factText.includes(claim.toLowerCase().replace(/\s/g, ""))) issues.push(issue("unsupported_numeric_claim", "numeric", validator, assertion.path));
    }
    const factViolations = findFactViolations(assertion.text, knowledge);
    if (factViolations.some((item) => !item.startsWith("命中产品禁用表达:") && !item.startsWith("使用了未提供的参数:"))) issues.push(issue("unsupported_product_truth", "truth", validator, assertion.path));
  }
  return issues.filter((item, index, all) => index === all.findIndex((candidate) => candidate.code === item.code && candidate.stage === item.stage && candidate.path === item.path));
}

export function validateTargetedRewrite(rewrite: TargetedRewrite, draft: ScriptDraftV2): ScriptWriterValidationIssue[] {
  const issues: ScriptWriterValidationIssue[] = [];
  const validator = "validateTargetedRewrite";
  if (!record(rewrite) || !Array.isArray(rewrite.changes) || rewrite.changes.length === 0) return [issue("invalid_rewrite", "targeted_rewrite", validator, "changes")];
  const sceneIds = new Set(draft.scenes.map((scene) => scene.id));
  rewrite.changes.forEach((change, index) => {
    const path = `changes.${index}`;
    if (!record(change) || !record(change.target) || !text(change.replacement)) { issues.push(issue("invalid_patch", "targeted_rewrite", validator, path)); return; }
    const target = change.target as CriticIssueTarget;
    if (!new Set(["hook", "scene", "cta", "narration"]).has(target.scope)) { issues.push(issue("invalid_patch_scope", "targeted_rewrite", validator, `${path}.target.scope`)); return; }
    if (target.scope === "scene") {
      if (!target.sceneId || !sceneIds.has(target.sceneId)) issues.push(issue("unknown_scene", "targeted_rewrite", validator, `${path}.target.sceneId`));
      if (!target.field || !new Set(["visual", "action", "dialogue", "evidenceRole"]).has(target.field)) issues.push(issue("invalid_patch_field", "targeted_rewrite", validator, `${path}.target.field`));
    } else if (target.scope === "hook" && target.field && !new Set(["line", "openingVisualExecution"]).has(target.field)) issues.push(issue("invalid_patch_field", "targeted_rewrite", validator, `${path}.target.field`));
    else if (target.scope === "cta" && target.field && target.field !== "cta") issues.push(issue("invalid_patch_field", "targeted_rewrite", validator, `${path}.target.field`));
    else if (target.scope === "narration" && target.field && target.field !== "fullNarration") issues.push(issue("invalid_patch_field", "targeted_rewrite", validator, `${path}.target.field`));
  });
  return issues;
}

function sceneTimes(scenes: ScriptDraftScene[]) {
  let cursor = 0;
  return scenes.map((scene) => {
    const duration = scene.durationHint || 3;
    const start = cursor;
    cursor += duration;
    return `${start}–${cursor}s`;
  });
}

export function adaptScriptDraftToStructuredScript(input: ScriptWriterInput, draft: ScriptDraftV2, revisionId?: string): StructuredScript & { revisionId: string; sourceCreativeBriefId: string; sourceCreativeBriefRevisionId: string } {
  const times = sceneTimes(draft.scenes);
  const brief = input.creativeBrief;
  const evidence = draft.scenes.filter((scene) => scene.purpose === "evidence").map((scene) => scene.dialogue).join(" ");
  const base: StructuredScript = {
    title: draft.title,
    product: input.productContext.productName,
    language: input.language,
    country: input.market,
    style: input.preferences?.creatorStyle || brief.direction.contentFormat || brief.direction.creatorPersona || "Creative Brief",
    creativeAngle: brief.direction.creativeAngle,
    hookType: brief.opening.hookMechanism,
    framework: "Creative Brief",
    hook: draft.hook.line,
    alternateHooks: [],
    narration: draft.fullNarration,
    conflict: brief.opportunity.tensionOrObjection || brief.opportunity.creativeOpportunity,
    productReveal: draft.scenes.find((scene) => scene.purpose === "product")?.dialogue || "",
    proof: evidence,
    sellingPoints: [brief.truth.primaryProductTruth, ...brief.truth.secondaryProductTruths].filter(Boolean).join("；"),
    cta: draft.cta,
    scenario: brief.opportunity.useMoment,
    proofMechanism: brief.evidence.type,
    ctaStyle: brief.ctaDirection,
    scenes: draft.scenes.map((scene, index) => ({ time: times[index], visual: scene.visual, line: scene.dialogue, edit: scene.action })),
  };
  const versioned = ensureScriptRevision(base, revisionId);
  return bindScriptToCreativeBrief(versioned, { id: brief.id, revisionId: brief.revisionId });
}
