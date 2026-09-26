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
import { checkCompliance, getGenerationComplianceKnowledge } from "./compliance-rules";
import { mutateProjectMemory, touchProject, type ProjectMemory } from "./project-memory";

export type CreativeBriefExpansionInput = {
  projectId: string;
  selectedDirection: CanonicalCreativeDirection;
  productContext: CanonicalProductContext;
  productContextFingerprint: string;
  market: string;
  language: string;
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
  issues: string[];
};

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
const optionalText = (value: unknown) => value === undefined || text(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);

export function parseCreativeBriefExpansion(content: string): CreativeBriefExecutionExpansion | null {
  let value: unknown;
  try { value = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")); }
  catch { return null; }
  const item = (value as { expansion?: unknown })?.expansion ?? value;
  if (!item || typeof item !== "object") return null;
  const candidate = item as Partial<CreativeBriefExecutionExpansion>;
  const evidence = candidate.evidenceStrategy;
  const risk = candidate.riskBoundaries;
  if (!text(candidate.hookMechanism) || !evidence || !evidenceTypes.has(evidence.type)
    || !text(evidence.objective) || !strings(evidence.visualEvidence) || !strings(evidence.limitations)
    || !text(candidate.ctaDirection) || !risk || !strings(risk.prohibitedClaims)
    || !strings(risk.requiredQualifiers) || !strings(risk.safetyConstraints)
    || !optionalText(candidate.creatorPersona) || !optionalText(candidate.contentFormat) || !optionalText(candidate.spokenTone)) return null;
  return structuredClone(candidate as CreativeBriefExecutionExpansion);
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
  const serialized = JSON.stringify(expansion);
  const issues: string[] = [];
  const banned = split(input.productContext.productKnowledge?.bannedWords);
  for (const term of banned) if (serialized.toLowerCase().includes(term.toLowerCase())) issues.push(`Forbidden claim: ${term}`);
  for (const hit of checkCompliance(serialized)) if (hit.level === "高") issues.push(`Compliance: ${hit.term}`);
  const factText = JSON.stringify(input.productContext).toLowerCase().replace(/\s/g, "");
  for (const claim of serialized.match(/\d+(?:[.,]\d+)?\s*(?:%|°|mm\b|cm\b|mah\b|w\b)/gi) || []) {
    if (!factText.includes(claim.toLowerCase().replace(/\s/g, ""))) issues.push(`Unsupported numeric claim: ${claim}`);
  }
  return [...new Set(issues)];
}

export function buildCreativeBrief(input: CreativeBriefExpansionInput, expansion: CreativeBriefExecutionExpansion, now = new Date().toISOString()) {
  if (productContextFingerprint(input.productContext) !== input.productContextFingerprint) throw new Error("Product Context fingerprint mismatch");
  const direction = input.selectedDirection.value;
  const truths = split(input.productContext.productKnowledge?.sellingPoints);
  const prohibitedClaims = [...new Set([...split(input.productContext.productKnowledge?.bannedWords), ...expansion.riskBoundaries.prohibitedClaims])];
  return createCreativeBrief({
    projectId: input.projectId,
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

function renderPrompt(input: CreativeBriefExpansionInput, repairIssues: string[] = []) {
  const compliance = getGenerationComplianceKnowledge();
  return [
    { role: "system" as const, content: "Expand the selected creative direction into execution strategy. Do not replace or rewrite its audience, use moment, motivation, tension, angle, content mechanism, hook line, or opening visual. Return JSON only. Never invent product facts, prices, offers, certifications, measurements, or effects." },
    { role: "user" as const, content: JSON.stringify({ task: "Return one expansion object", selectedDirection: input.selectedDirection, productTruth: input.productContext, market: input.market, language: input.language, platform: input.platform, preferences: input.preferences, sourceContext: input.sourceContext, recentCreativeHistory: input.recentCreativeHistory, allowedEvidenceTypes: [...evidenceTypes], requiredShape: { hookMechanism: "string", evidenceStrategy: { type: "allowed enum", objective: "string", visualEvidence: ["string"], limitations: ["string"] }, ctaDirection: "strategy, not final copy", riskBoundaries: { prohibitedClaims: ["string"], requiredQualifiers: ["string"], safetyConstraints: ["string"] }, creatorPersona: "optional string", contentFormat: "optional string", spokenTone: "optional string" }, compliance: { highRiskExpressions: compliance.highRiskExpressions, productForbiddenClaims: split(input.productContext.productKnowledge?.bannedWords) }, repairIssues }) },
  ];
}

export async function generateCreativeBrief(input: CreativeBriefExpansionInput, provider: CreativeBrainProvider): Promise<CreativeBriefExpansionResult> {
  const metadata: CreativeBriefExpansionMetadata = { repairAttempted: false, fallbackUsed: false, errorType: null };
  let issues: string[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await provider({ messages: renderPrompt(input, issues), temperature: 0.45, topP: 0.9, maxTokens: 1400, timeoutMs: 45_000 });
      const expansion = parseCreativeBriefExpansion(response.content);
      issues = expansion ? validateCreativeBriefExpansion(expansion, input) : ["Expansion output is not valid JSON or does not satisfy the schema"];
      if (expansion && issues.length === 0) return { status: "success", brief: buildCreativeBrief(input, expansion), metadata, issues: [] };
      if (attempt === 0) { metadata.repairAttempted = true; continue; }
      metadata.errorType = "validation_failed";
      return { status: "failure", brief: null, metadata, issues };
    } catch (error) {
      if (attempt === 0 && !isCreativeBrainTransportFailure(error)) { metadata.repairAttempted = true; issues = ["Provider output could not be expanded safely"]; continue; }
      metadata.errorType = "provider_failure";
      return { status: "failure", brief: null, metadata, issues: ["Creative Brief provider request failed"] };
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
  if (!response.ok || value.status === "failure" || !value.brief) throw new Error(value.error?.message || "创意简报生成失败，请重试");
  return value;
}
