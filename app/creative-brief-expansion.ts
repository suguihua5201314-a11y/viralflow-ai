import {
  appendCreativeBriefRevision,
  createCreativeBrief,
  type CreativeBriefPreferences,
  type CreativeBriefV2,
  type EvidenceStrategy,
  type EvidenceStrategyType,
} from "./creative-contract";
import type { CreativeBrainProvider, CreativeBrainSourceContext, RecentCreativeHistory } from "./creative-brain";
import { isCreativeBrainTransportFailure } from "./creative-brain";
import type { CanonicalCreativeDirection } from "./creative-opportunity-selection";
import { productContextFingerprint } from "./creative-opportunity-selection";
import type { CanonicalProductContext } from "./product-context";
import { checkCompliance, getGenerationComplianceKnowledge, type HighRiskComplianceRuleFamily } from "./compliance-rules";
import { mutateProjectMemory, touchProject, type ProjectMemory } from "./project-memory";
import { resolveCreationLanguageContext, validateInternalCreativeLanguage, type CreationLanguageContext } from "./creation-language-context";

export type CreativeBriefExpansionInput = {
  projectId: string;
  selectedDirection: CanonicalCreativeDirection;
  productContext: CanonicalProductContext;
  productContextFingerprint: string;
  languageContext?: CreationLanguageContext;
  market: string;
  language?: string;
  workspaceLanguage?: "zh-CN";
  targetLanguage?: string;
  platform: string;
  preferences?: CreativeBriefPreferences;
  sourceContext?: CreativeBrainSourceContext;
  recentCreativeHistory?: RecentCreativeHistory[];
};

export type CreativeBriefExecutionExpansion = {
  hookMechanism: string;
  evidenceStrategy: EvidenceStrategy;
  ctaDirection: string;
  riskBoundaries: {
    prohibitedClaims: string[];
    requiredQualifiers: string[];
    safetyConstraints: string[];
  };
  creatorPersona?: string;
  contentFormat?: string;
  spokenTone?: string;
};

export type CreativeBriefExpansionMetadata = {
  repairAttempted: boolean;
  fallbackUsed: false;
  errorType: "provider_failure" | "invalid_output" | "validation_failed" | null;
};

export type CreativeBriefExpansionResult = {
  status: "success" | "failure";
  brief: CreativeBriefV2 | null;
  metadata: CreativeBriefExpansionMetadata;
  issues: CreativeBriefValidationIssue[];
};

export type CreativeBriefValidationIssue = {
  code: string;
  path?: string;
  stage: "json_parse" | "expansion_schema" | "internal_language" | "truth" | "compliance" | "numeric";
  validator: string;
  ruleFamily?: HighRiskComplianceRuleFamily;
};

export type CreativeBriefExpansionParseResult = {
  value: CreativeBriefExecutionExpansion | null;
  issues: CreativeBriefValidationIssue[];
};

export function validationIssuesForEnvironment(issues: CreativeBriefValidationIssue[], environment?: string) {
  return environment === "preview" ? issues : [];
}

export type CreativeBriefRequestIdentity = {
  requestId: string;
  projectId: string;
  canonicalDirectionId: string;
  productContextFingerprint: string;
};

const evidenceTypes = new Set<EvidenceStrategyType>([
  "observable-demonstration", "application", "before-after", "sensory", "fit-movement", "preparation",
  "reaction", "routine-context", "comparison", "education", "testimonial", "none-required",
]);
const text = (value: unknown): value is string => typeof value === "string" && Boolean(value.trim());
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);
const MAX_SAFETY_ITEMS = 12;
const MAX_SAFETY_TEXT_LENGTH = 500;

export function resolveCreativeBriefInputLanguageContext(input: CreativeBriefExpansionInput) {
  return input.languageContext || resolveCreationLanguageContext(input);
}

const issue = (
  code: string,
  stage: CreativeBriefValidationIssue["stage"],
  validator: string,
  path?: string,
): CreativeBriefValidationIssue => ({ code, ...(path ? { path } : {}), stage, validator });

export function parseCreativeBriefExpansion(content: string): CreativeBriefExpansionParseResult {
  let value: unknown;
  try { value = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")); }
  catch { return { value: null, issues: [issue("invalid_json", "json_parse", "parseCreativeBriefExpansion")] }; }
  const item = value && typeof value === "object" && "expansion" in value ? (value as { expansion?: unknown }).expansion : value;
  if (!item || typeof item !== "object" || Array.isArray(item)) return { value: null, issues: [issue("invalid_top_level", "expansion_schema", "parseCreativeBriefExpansion")] };
  const candidate = item as Record<string, unknown>;
  const issues: CreativeBriefValidationIssue[] = [];
  const requiredText = (path: string, field: unknown) => {
    if (field === undefined) issues.push(issue("missing_field", "expansion_schema", "parseCreativeBriefExpansion", path));
    else if (!text(field)) issues.push(issue("invalid_type", "expansion_schema", "parseCreativeBriefExpansion", path));
  };
  const requiredStrings = (path: string, field: unknown) => {
    if (field === undefined) issues.push(issue("missing_field", "expansion_schema", "parseCreativeBriefExpansion", path));
    else if (!strings(field)) issues.push(issue("invalid_type", "expansion_schema", "parseCreativeBriefExpansion", path));
  };
  const safetyStrings = (path: string, field: unknown) => {
    requiredStrings(path, field);
    if (!strings(field)) return;
    if (field.length > MAX_SAFETY_ITEMS) issues.push(issue("too_many_items", "expansion_schema", "parseCreativeBriefExpansion", path));
    if (field.some((item) => item.trim().length > MAX_SAFETY_TEXT_LENGTH)) issues.push(issue("text_too_long", "expansion_schema", "parseCreativeBriefExpansion", path));
  };
  const optionalString = (path: string, field: unknown) => {
    if (field !== undefined && !text(field)) issues.push(issue("invalid_type", "expansion_schema", "parseCreativeBriefExpansion", path));
  };
  requiredText("hookMechanism", candidate.hookMechanism);
  if (candidate.evidenceStrategy === undefined) issues.push(issue("missing_field", "expansion_schema", "parseCreativeBriefExpansion", "evidenceStrategy"));
  else if (!candidate.evidenceStrategy || typeof candidate.evidenceStrategy !== "object" || Array.isArray(candidate.evidenceStrategy)) issues.push(issue("invalid_type", "expansion_schema", "parseCreativeBriefExpansion", "evidenceStrategy"));
  else {
    const evidence = candidate.evidenceStrategy as Record<string, unknown>;
    if (evidence.type === undefined) issues.push(issue("missing_field", "expansion_schema", "parseCreativeBriefExpansion", "evidenceStrategy.type"));
    else if (typeof evidence.type !== "string") issues.push(issue("invalid_type", "expansion_schema", "parseCreativeBriefExpansion", "evidenceStrategy.type"));
    else if (!evidenceTypes.has(evidence.type as EvidenceStrategyType)) issues.push(issue("invalid_enum", "expansion_schema", "parseCreativeBriefExpansion", "evidenceStrategy.type"));
    requiredText("evidenceStrategy.objective", evidence.objective);
    requiredStrings("evidenceStrategy.visualEvidence", evidence.visualEvidence);
    safetyStrings("evidenceStrategy.limitations", evidence.limitations);
  }
  requiredText("ctaDirection", candidate.ctaDirection);
  if (candidate.riskBoundaries === undefined) issues.push(issue("missing_field", "expansion_schema", "parseCreativeBriefExpansion", "riskBoundaries"));
  else if (!candidate.riskBoundaries || typeof candidate.riskBoundaries !== "object" || Array.isArray(candidate.riskBoundaries)) issues.push(issue("invalid_type", "expansion_schema", "parseCreativeBriefExpansion", "riskBoundaries"));
  else {
    const risk = candidate.riskBoundaries as Record<string, unknown>;
    safetyStrings("riskBoundaries.prohibitedClaims", risk.prohibitedClaims);
    safetyStrings("riskBoundaries.requiredQualifiers", risk.requiredQualifiers);
    safetyStrings("riskBoundaries.safetyConstraints", risk.safetyConstraints);
  }
  optionalString("creatorPersona", candidate.creatorPersona);
  optionalString("contentFormat", candidate.contentFormat);
  optionalString("spokenTone", candidate.spokenTone);
  if (issues.length > 0) return { value: null, issues };
  const normalized = structuredClone(candidate as CreativeBriefExecutionExpansion);
  const normalizeSafety = (items: string[]) => [...new Set(items.map((item) => item.trim()))];
  normalized.evidenceStrategy.limitations = normalizeSafety(normalized.evidenceStrategy.limitations);
  normalized.riskBoundaries.prohibitedClaims = normalizeSafety(normalized.riskBoundaries.prohibitedClaims);
  normalized.riskBoundaries.requiredQualifiers = normalizeSafety(normalized.riskBoundaries.requiredQualifiers);
  normalized.riskBoundaries.safetyConstraints = normalizeSafety(normalized.riskBoundaries.safetyConstraints);
  return { value: normalized, issues: [] };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stableValue(item)]));
  return value;
}

function split(value?: string) {
  return String(value || "").split(/[；;\n]+/).map((item) => item.trim()).filter(Boolean);
}

function sourceReferences(source: CreativeBrainSourceContext | undefined, recent: RecentCreativeHistory[] | undefined) {
  return {
    analyzerSourceId: source?.kind === "analyzer" ? source.sourceId : undefined,
    replicationSourceId: source?.kind === "replication" ? source.sourceId : undefined,
    referenceScriptSourceId: source?.kind === "reference-script" ? source.sourceId : undefined,
    recentScriptRevisionIds: (recent || []).map((item) => String((item as { revisionId?: string }).revisionId || "")).filter(Boolean),
  };
}

export function validateCreativeBriefExpansion(expansion: CreativeBriefExecutionExpansion, input: CreativeBriefExpansionInput) {
  const issues: CreativeBriefValidationIssue[] = [];
  const languageContext = resolveCreativeBriefInputLanguageContext(input);
  if (input.languageContext || input.workspaceLanguage || input.targetLanguage) {
    const internalFields = [
      { path: "hookMechanism", text: expansion.hookMechanism },
      { path: "evidenceStrategy.objective", text: expansion.evidenceStrategy.objective },
      ...expansion.evidenceStrategy.visualEvidence.map((text, index) => ({ path: `evidenceStrategy.visualEvidence.${index}`, text })),
      ...expansion.evidenceStrategy.limitations.map((text, index) => ({ path: `evidenceStrategy.limitations.${index}`, text })),
      { path: "ctaDirection", text: expansion.ctaDirection },
      ...expansion.riskBoundaries.prohibitedClaims.map((text, index) => ({ path: `riskBoundaries.prohibitedClaims.${index}`, text })),
      ...expansion.riskBoundaries.requiredQualifiers.map((text, index) => ({ path: `riskBoundaries.requiredQualifiers.${index}`, text })),
      ...expansion.riskBoundaries.safetyConstraints.map((text, index) => ({ path: `riskBoundaries.safetyConstraints.${index}`, text })),
      { path: "creatorPersona", text: expansion.creatorPersona }, { path: "contentFormat", text: expansion.contentFormat },
      { path: "spokenTone", text: expansion.spokenTone },
    ];
    for (const mismatch of validateInternalCreativeLanguage(internalFields, languageContext.workspaceLanguage)) {
      issues.push(issue(mismatch.code, "internal_language", "validateCreativeBriefExpansion", mismatch.path));
    }
  }
  const banned = split(input.productContext.productKnowledge?.bannedWords);
  const factText = JSON.stringify(input.productContext).toLowerCase().replace(/\s/g, "");
  for (const assertion of collectCreativeAssertionSurface(expansion)) {
    for (const term of banned) if (assertion.text.toLowerCase().includes(term.toLowerCase())) issues.push(issue("forbidden_claim", "truth", "validateCreativeBriefExpansion", assertion.path));
    for (const hit of checkCompliance(assertion.text)) if (hit.level === "高") issues.push({ ...issue("high_risk_compliance", "compliance", "validateCreativeBriefExpansion", assertion.path), ...(hit.ruleFamily ? { ruleFamily: hit.ruleFamily } : {}) });
    for (const claim of assertion.text.match(/\d+(?:[.,]\d+)?\s*(?:%|°|mm\b|cm\b|mah\b|w\b)/gi) || []) {
      if (!factText.includes(claim.toLowerCase().replace(/\s/g, ""))) issues.push(issue("unsupported_numeric_claim", "numeric", "validateCreativeBriefExpansion", assertion.path));
    }
  }
  return issues.filter((item, index, all) => index === all.findIndex((candidate) => candidate.code === item.code && candidate.stage === item.stage && candidate.path === item.path));
}

export function collectCreativeAssertionSurface(expansion: CreativeBriefExecutionExpansion) {
  return [
    { path: "evidenceStrategy.objective", text: expansion.evidenceStrategy.objective },
    ...expansion.evidenceStrategy.visualEvidence.map((text, index) => ({ path: `evidenceStrategy.visualEvidence.${index}`, text })),
    { path: "ctaDirection", text: expansion.ctaDirection },
  ];
}

export function buildCreativeBrief(input: CreativeBriefExpansionInput, expansion: CreativeBriefExecutionExpansion, now = new Date().toISOString()) {
  if (productContextFingerprint(input.productContext) !== input.productContextFingerprint) throw new Error("Product Context fingerprint mismatch");
  const direction = input.selectedDirection.value;
  const truths = split(input.productContext.productKnowledge?.sellingPoints);
  const prohibitedClaims = [...new Set([...split(input.productContext.productKnowledge?.bannedWords), ...expansion.riskBoundaries.prohibitedClaims])];
  return createCreativeBrief({
    projectId: input.projectId,
    languageContext: resolveCreativeBriefInputLanguageContext(input),
    opportunityReference: { canonicalOpportunityId: input.selectedDirection.id, sourceCandidateId: input.selectedDirection.sourceCandidateId },
    productReference: { productProfileId: input.productContext.profileId ?? undefined, productName: input.productContext.productName, contextFingerprint: input.productContextFingerprint },
    sources: sourceReferences(input.sourceContext, input.recentCreativeHistory),
    opportunity: { targetAudience: direction.targetAudience, useMoment: direction.useMoment, purchaseMotivation: direction.coreMotivation, tensionOrObjection: direction.coreTension, creativeOpportunity: direction.creativeAngle },
    direction: { contentMechanisms: [direction.contentMechanism], creativeAngle: direction.creativeAngle, creatorPersona: expansion.creatorPersona, contentFormat: expansion.contentFormat, spokenTone: expansion.spokenTone },
    opening: { hookMechanism: expansion.hookMechanism, hookLine: direction.hookLine, visual: structuredClone(direction.openingVisual) },
    truth: { primaryProductTruth: truths[0] || input.productContext.productKnowledge?.parameters?.trim() || input.productContext.productName, secondaryProductTruths: truths.slice(1) },
    evidence: structuredClone(expansion.evidenceStrategy),
    ctaDirection: expansion.ctaDirection,
    riskBoundaries: { prohibitedClaims, requiredQualifiers: [...expansion.riskBoundaries.requiredQualifiers], safetyConstraints: [...new Set([...split(input.productContext.productKnowledge?.notes), ...expansion.riskBoundaries.safetyConstraints])] },
    preferences: input.preferences ? { ...input.preferences } : undefined,
    createdAt: now,
  });
}

function renderPrompt(input: CreativeBriefExpansionInput, repairIssues: CreativeBriefValidationIssue[] = [], repairExpansion?: CreativeBriefExecutionExpansion | null) {
  const compliance = getGenerationComplianceKnowledge();
  const languageContext = resolveCreativeBriefInputLanguageContext(input);
  const providerRepairIssues = repairIssues.map(({ code, path, stage, validator }) => ({ code, ...(path ? { path } : {}), stage, validator }));
  return [
    { role: "system" as const, content: "Create an internal creative strategy document for a Chinese-speaking production team. Return all human-readable strategy content in Simplified Chinese. The target market and targetLanguage are downstream audience and localization constraints; do not localize the Brief into targetLanguage. Expand the selected direction without replacing or rewriting its audience, use moment, motivation, tension, angle, content mechanism, hook line, or opening visual. Return JSON only. Never invent product facts, prices, offers, certifications, measurements, or effects. On language repair, only re-express the previous expansion in Simplified Chinese and preserve every strategy decision." },
    { role: "user" as const, content: JSON.stringify({ task: "Return one expansion object", selectedDirection: input.selectedDirection, productTruth: input.productContext, languageContext, preferences: input.preferences, sourceContext: input.sourceContext, recentCreativeHistory: input.recentCreativeHistory, allowedEvidenceTypes: [...evidenceTypes], requiredShape: { hookMechanism: "string", evidenceStrategy: { type: "allowed enum", objective: "string", visualEvidence: ["string"], limitations: ["string"] }, ctaDirection: "strategy, not final copy", riskBoundaries: { prohibitedClaims: ["string"], requiredQualifiers: ["string"], safetyConstraints: ["string"] }, creatorPersona: "optional string", contentFormat: "optional string", spokenTone: "optional string" }, compliance: { highRiskExpressions: compliance.highRiskExpressions, productForbiddenClaims: split(input.productContext.productKnowledge?.bannedWords) }, repairIssues: providerRepairIssues, ...(repairExpansion ? { repairExpansion, repairInstruction: "Re-express only in Simplified Chinese; preserve meaning and structure." } : {}) }) },
  ];
}

export async function generateCreativeBrief(
  input: CreativeBriefExpansionInput,
  provider: CreativeBrainProvider,
  observeValidation?: (event: { attempt: number; issues: CreativeBriefValidationIssue[] }) => void,
): Promise<CreativeBriefExpansionResult> {
  const metadata: CreativeBriefExpansionMetadata = { repairAttempted: false, fallbackUsed: false, errorType: null };
  let issues: CreativeBriefValidationIssue[] = [];
  let repairExpansion: CreativeBriefExecutionExpansion | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await provider({ messages: renderPrompt(input, issues, repairExpansion), temperature: 0.45, topP: 0.9, maxTokens: 1400, timeoutMs: 45_000 });
      const parsed = parseCreativeBriefExpansion(response.content);
      issues = parsed.value ? validateCreativeBriefExpansion(parsed.value, input) : parsed.issues;
      if (issues.length > 0) observeValidation?.({ attempt: attempt + 1, issues });
      if (parsed.value && issues.length === 0) return { status: "success", brief: buildCreativeBrief(input, parsed.value), metadata, issues: [] };
      if (attempt === 0) { metadata.repairAttempted = true; repairExpansion = parsed.value; continue; }
      metadata.errorType = "validation_failed";
      return { status: "failure", brief: null, metadata, issues };
    } catch (error) {
      if (attempt === 0 && !isCreativeBrainTransportFailure(error)) {
        metadata.repairAttempted = true;
        issues = [issue("invalid_output", "expansion_schema", "generateCreativeBrief")];
        observeValidation?.({ attempt: attempt + 1, issues });
        continue;
      }
      metadata.errorType = "provider_failure";
      return { status: "failure", brief: null, metadata, issues: [] };
    }
  }
  return { status: "failure", brief: null, metadata: { ...metadata, errorType: "invalid_output" }, issues };
}

export function persistExpandedCreativeBrief(memory: ProjectMemory, writerId: string, expected: CreativeBriefRequestIdentity, active: CreativeBriefRequestIdentity | null, brief: CreativeBriefV2, now?: string) {
  if (!active || JSON.stringify(stableValue(expected)) !== JSON.stringify(stableValue(active))) return memory;
  if (brief.projectId !== expected.projectId || brief.productReference.contextFingerprint !== expected.productContextFingerprint || brief.opportunityReference?.canonicalOpportunityId !== expected.canonicalDirectionId) return memory;
  return mutateProjectMemory(memory, writerId, (current) => {
    const project = current.projects.find((item) => item.id === expected.projectId);
    if (!project) return current;
    const revisions = project.assets.creativeBriefRevisions || [];
    const sameRevision = revisions.find((item) => item.revisionId === brief.revisionId);
    if (sameRevision && project.assets.currentCreativeBriefRevisionId === brief.revisionId) return current;
    return { ...current, projects: current.projects.map((item) => item.id === expected.projectId ? touchProject(item, { assets: { ...item.assets, creativeBriefRevisions: appendCreativeBriefRevision(revisions, brief), currentCreativeBriefRevisionId: brief.revisionId } }) : item) };
  }, now);
}

export async function parseCreativeBriefApiResponse(response: Response): Promise<CreativeBriefExpansionResult> {
  const isJson = response.headers.get("content-type")?.toLowerCase().includes("application/json");
  if (!isJson) { await response.text().catch(() => ""); throw new Error("创意简报生成失败，请重试"); }
  let value: CreativeBriefExpansionResult & { error?: { message?: string } };
  try { value = await response.json(); } catch { throw new Error("创意简报生成失败，请重试"); }
  if (!response.ok || value.status === "failure" || !value.brief) {
    const error = new Error(value.error?.message || "创意简报生成失败，请重试") as Error & { validationIssue?: CreativeBriefValidationIssue };
    if (Array.isArray(value.issues) && value.issues[0]) error.validationIssue = value.issues[0];
    throw error;
  }
  return value;
}
