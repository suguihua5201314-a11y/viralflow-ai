export const CREATIVE_BRIEF_SCHEMA_VERSION = 2 as const;

export type EvidenceStrategyType =
  | "observable-demonstration"
  | "application"
  | "before-after"
  | "sensory"
  | "fit-movement"
  | "preparation"
  | "reaction"
  | "routine-context"
  | "comparison"
  | "education"
  | "testimonial"
  | "none-required";

export type OpeningVisual = {
  subject: string;
  setup: string;
  action: string;
  visibleChangeOrQuestion?: string;
};

export type EvidenceStrategy = {
  type: EvidenceStrategyType;
  objective: string;
  visualEvidence: string[];
  limitations: string[];
};

export type CreativeOpportunity = {
  id: string;
  targetAudience: string;
  useMoment: string;
  purchaseMotivation: string;
  tensionOrObjection?: string;
  opportunity: string;
  contentMechanisms: string[];
  creativeAngle: string;
  hookMechanism: string;
  hookLine: string;
  openingVisual: OpeningVisual;
  evidenceStrategy: EvidenceStrategy;
  creatorPersona?: string;
  contentFormat?: string;
  ctaDirection: string;
  riskNotes: string[];
};

export type CreativeSignalProfile = {
  functional?: boolean;
  aesthetic?: boolean;
  sensory?: boolean;
  wearable?: boolean;
  routineBased?: boolean;
  visuallyDemonstrable?: boolean;
  transformationCapable?: boolean;
};

export type CreativeBriefSourceReferences = {
  analyzerSourceId?: string;
  replicationSourceId?: string;
  referenceScriptSourceId?: string;
  recentScriptRevisionIds: string[];
};

export type CreativeBriefPreferences = {
  creationMode?: string;
  hookStrategy?: string;
  framework?: string;
  creativity?: string;
};

export type CreativeOpportunityReference = {
  canonicalOpportunityId: string;
  sourceCandidateId?: string;
};

export type CreativeBriefV2 = {
  schemaVersion: typeof CREATIVE_BRIEF_SCHEMA_VERSION;
  id: string;
  revisionId: string;
  projectId: string;
  opportunityReference?: CreativeOpportunityReference;
  productReference: {
    productProfileId?: string | number;
    productName: string;
    contextFingerprint: string;
  };
  sources: CreativeBriefSourceReferences;
  opportunity: {
    targetAudience: string;
    useMoment: string;
    purchaseMotivation: string;
    tensionOrObjection?: string;
    creativeOpportunity: string;
  };
  direction: {
    contentMechanisms: string[];
    creativeAngle: string;
    creatorPersona?: string;
    contentFormat?: string;
    spokenTone?: string;
  };
  opening: {
    hookMechanism: string;
    hookLine: string;
    visual: OpeningVisual;
  };
  truth: {
    primaryProductTruth: string;
    secondaryProductTruths: string[];
  };
  evidence: EvidenceStrategy;
  ctaDirection: string;
  riskBoundaries: {
    prohibitedClaims: string[];
    requiredQualifiers: string[];
    safetyConstraints: string[];
  };
  preferences?: CreativeBriefPreferences;
  createdAt: string;
};

export type CreativeBriefLineage = {
  sourceCreativeBriefId?: string;
  sourceCreativeBriefRevisionId?: string;
};

const briefPrefix = "creative-brief-";
const revisionPrefix = "creative-brief-revision-";
const opportunityPrefix = "creative-opportunity-";

function secureId(prefix: string) {
  if (typeof globalThis.crypto?.randomUUID === "function") return `${prefix}${globalThis.crypto.randomUUID()}`;
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues(bytes);
  if (!bytes.some(Boolean)) throw new Error("Secure creative brief identity is unavailable");
  return `${prefix}${Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("")}`;
}

export function createCreativeBriefId() {
  return secureId(briefPrefix);
}

export function createCreativeBriefRevisionId() {
  return secureId(revisionPrefix);
}

export function createCanonicalCreativeOpportunityId() {
  return secureId(opportunityPrefix);
}

export function createCreativeBrief(
  input: Omit<CreativeBriefV2, "schemaVersion" | "id" | "revisionId">,
  identity: { id?: string; revisionId?: string } = {},
): CreativeBriefV2 {
  return {
    ...input,
    schemaVersion: CREATIVE_BRIEF_SCHEMA_VERSION,
    id: identity.id || createCreativeBriefId(),
    revisionId: identity.revisionId || createCreativeBriefRevisionId(),
  };
}

export function reviseCreativeBrief(
  brief: CreativeBriefV2,
  patch: Partial<Omit<CreativeBriefV2, "schemaVersion" | "id" | "revisionId" | "projectId">>,
  revisionId = createCreativeBriefRevisionId(),
): CreativeBriefV2 {
  return { ...brief, ...patch, revisionId };
}

export function appendCreativeBriefRevision(
  revisions: CreativeBriefV2[] | undefined,
  revision: CreativeBriefV2,
) {
  return [...(revisions || []).filter((item) => item.revisionId !== revision.revisionId), revision];
}
