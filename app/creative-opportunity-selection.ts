import {
  appendCreativeBriefRevision,
  createCanonicalCreativeOpportunityId,
  createCreativeBrief,
  type CreativeBriefPreferences,
  type CreativeBriefV2,
  type CreativeOpportunity,
} from "./creative-contract";
import type { CreativeBrainSourceContext } from "./creative-brain";
import type { CanonicalProductContext } from "./product-context";
import { mutateProjectMemory, touchProject, type ProjectMemory } from "./project-memory";

export type CanonicalCreativeOpportunity = {
  id: string;
  sourceCandidateId?: string;
  value: Omit<CreativeOpportunity, "id">;
};

export type CreativeOpportunitySelectionInput = {
  projectId: string;
  opportunity: CanonicalCreativeOpportunity;
  productContext: CanonicalProductContext;
  market: string;
  language: string;
  platform: string;
  preferences?: CreativeBriefPreferences;
  sourceContext?: CreativeBrainSourceContext;
  recentScriptRevisionIds?: string[];
  now?: string;
};

export type CreativeOpportunitySelectionResult = {
  memory: ProjectMemory;
  brief: CreativeBriefV2 | null;
  status: "created" | "existing" | "project-not-found";
};

export function canonicalizeCreativeOpportunity(
  candidate: CreativeOpportunity,
  canonicalId = createCanonicalCreativeOpportunityId(),
): CanonicalCreativeOpportunity {
  const { id: sourceCandidateId, ...value } = candidate;
  return { id: canonicalId, sourceCandidateId, value: structuredClone(value) };
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stableValue(item)]));
  return value;
}

function productContextFingerprint(context: CanonicalProductContext) {
  const source = JSON.stringify(stableValue({ productName: context.productName, profileId: context.profileId, productKnowledge: context.productKnowledge || null }));
  let hash = 2166136261;
  for (let index = 0; index < source.length; index++) hash = Math.imul(hash ^ source.charCodeAt(index), 16777619);
  return `product-context-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function splitKnowledge(value?: string) {
  return String(value || "").split(/[；;\n]+/).map((item) => item.trim()).filter(Boolean);
}

function sourceReferences(source: CreativeBrainSourceContext | undefined, recentScriptRevisionIds: string[]) {
  return {
    analyzerSourceId: source?.kind === "analyzer" ? source.sourceId : undefined,
    replicationSourceId: source?.kind === "replication" ? source.sourceId : undefined,
    referenceScriptSourceId: source?.kind === "reference-script" ? source.sourceId : undefined,
    recentScriptRevisionIds: [...recentScriptRevisionIds],
  };
}

export function createBriefFromSelectedOpportunity(input: CreativeOpportunitySelectionInput): CreativeBriefV2 {
  const item = input.opportunity.value;
  const knowledge = input.productContext.productKnowledge;
  const truths = splitKnowledge(knowledge?.sellingPoints);
  const primaryProductTruth = truths[0] || knowledge?.parameters?.trim() || input.productContext.productName;
  const prohibitedClaims = splitKnowledge(knowledge?.bannedWords);
  const safetyConstraints = [...new Set([...item.riskNotes, ...splitKnowledge(knowledge?.notes)])];
  return createCreativeBrief({
    projectId: input.projectId,
    opportunityReference: {
      canonicalOpportunityId: input.opportunity.id,
      sourceCandidateId: input.opportunity.sourceCandidateId,
    },
    productReference: {
      productProfileId: input.productContext.profileId ?? undefined,
      productName: input.productContext.productName,
      contextFingerprint: productContextFingerprint(input.productContext),
    },
    sources: sourceReferences(input.sourceContext, input.recentScriptRevisionIds || []),
    opportunity: {
      targetAudience: item.targetAudience,
      useMoment: item.useMoment,
      purchaseMotivation: item.purchaseMotivation,
      tensionOrObjection: item.tensionOrObjection,
      creativeOpportunity: item.opportunity,
    },
    direction: {
      contentMechanisms: [...item.contentMechanisms],
      creativeAngle: item.creativeAngle,
      creatorPersona: item.creatorPersona,
      contentFormat: item.contentFormat,
    },
    opening: {
      hookMechanism: item.hookMechanism,
      hookLine: item.hookLine,
      visual: { ...item.openingVisual },
    },
    truth: {
      primaryProductTruth,
      secondaryProductTruths: truths.slice(1),
    },
    evidence: {
      ...item.evidenceStrategy,
      visualEvidence: [...item.evidenceStrategy.visualEvidence],
      limitations: [...item.evidenceStrategy.limitations],
    },
    ctaDirection: item.ctaDirection,
    riskBoundaries: {
      prohibitedClaims,
      requiredQualifiers: [...item.evidenceStrategy.limitations],
      safetyConstraints,
    },
    preferences: input.preferences ? { ...input.preferences } : undefined,
    createdAt: input.now || new Date().toISOString(),
  });
}

export function selectCreativeOpportunity(
  memory: ProjectMemory,
  writerId: string,
  input: CreativeOpportunitySelectionInput,
): CreativeOpportunitySelectionResult {
  const project = memory.projects.find((item) => item.id === input.projectId);
  if (!project) return { memory, brief: null, status: "project-not-found" };
  const existing = project.assets.creativeBriefRevisions?.find((brief) => brief.opportunityReference?.canonicalOpportunityId === input.opportunity.id);
  if (existing) return { memory, brief: existing, status: "existing" };
  const brief = createBriefFromSelectedOpportunity(input);
  const next = mutateProjectMemory(memory, writerId, (current) => ({
    ...current,
    projects: current.projects.map((item) => item.id === input.projectId
      ? touchProject(item, { assets: {
        ...item.assets,
        creativeBriefRevisions: appendCreativeBriefRevision(item.assets.creativeBriefRevisions, brief),
        currentCreativeBriefRevisionId: brief.revisionId,
      } })
      : item),
  }), input.now);
  return { memory: next, brief, status: "created" };
}
