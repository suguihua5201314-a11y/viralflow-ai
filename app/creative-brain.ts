import type { CreativeOpportunity, EvidenceStrategyType } from "./creative-contract";
import type { CanonicalProductContext } from "./product-context";
import { checkCompliance, getGenerationComplianceKnowledge } from "./compliance-rules";
import { buildKnowledgeContext, findFactViolations, type MemoryScript } from "./knowledge-context";
import type { ProviderErrorType, ProviderId } from "./provider-types";

export type CreativeBrainPreferences = {
  creationMode?: string;
  hookStrategy?: string;
  framework?: string;
  creativity?: string;
};

export type CreativeBrainSourceContext = {
  kind: "analyzer" | "replication" | "reference-script";
  sourceId?: string;
  whyItWorked?: string[];
  mechanism?: string;
  audienceTension?: string;
  referenceText?: string;
};

export type RecentCreativeHistory = Pick<MemoryScript, "title" | "hook" | "creativeAngle" | "scenario" | "proofMechanism" | "cta">;

export type CreativeBrainInput = {
  projectId: string;
  productContext: CanonicalProductContext;
  market: string;
  language: string;
  platform: string;
  preferences?: CreativeBrainPreferences;
  sourceContext?: CreativeBrainSourceContext;
  recentCreativeHistory?: RecentCreativeHistory[];
  candidateCount?: number;
};

export type CreativeBrainProviderRequest = {
  messages: Array<{ role: "system" | "user"; content: string }>;
  temperature: number;
  topP: number;
  maxTokens: number;
  timeoutMs: number;
};

export type CreativeBrainProviderResponse = {
  content: string;
  providerRequested: ProviderId;
  providerUsed: ProviderId;
  model: string | null;
  responseTimeMs: number;
};

export type CreativeBrainProvider = (request: CreativeBrainProviderRequest) => Promise<CreativeBrainProviderResponse>;

export type OpportunityValidationIssue = {
  candidateId?: string;
  type: "schema" | "truth" | "compliance" | "history" | "diversity" | "feasibility";
  message: string;
};

export type CreativeBrainMetadata = {
  providerRequested: ProviderId | null;
  providerUsed: ProviderId | null;
  model: string | null;
  candidateCount: number;
  validCandidateCount: number;
  repairAttempted: boolean;
  fallbackUsed: false;
  errorType: ProviderErrorType | "invalid_output" | "insufficient_candidates" | null;
  responseTimeMs: number | null;
};

export type CreativeBrainResult = {
  status: "success" | "partial" | "failure";
  opportunities: CreativeOpportunity[];
  metadata: CreativeBrainMetadata;
  validationSummary: { issues: OpportunityValidationIssue[]; diversityPassed: boolean };
};

const evidenceTypes = new Set<EvidenceStrategyType>([
  "observable-demonstration", "application", "before-after", "sensory", "fit-movement", "preparation",
  "reaction", "routine-context", "comparison", "education", "testimonial", "none-required",
]);
const requiredText = (value: unknown) => typeof value === "string" && Boolean(value.trim());
const optionalText = (value: unknown) => value === undefined || requiredText(value);
const stringArray = (value: unknown) => Array.isArray(value) && value.every(requiredText);
const normalize = (value: string) => value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");

export function parseCreativeOpportunities(content: string): { opportunities: CreativeOpportunity[]; issues: OpportunityValidationIssue[] } {
  let value: unknown;
  try {
    const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
    value = JSON.parse(cleaned);
  } catch {
    return { opportunities: [], issues: [{ type: "schema", message: "Creative Brain response is not valid JSON" }] };
  }
  const candidates = Array.isArray(value) ? value : (value as { opportunities?: unknown })?.opportunities;
  if (!Array.isArray(candidates)) return { opportunities: [], issues: [{ type: "schema", message: "opportunities must be an array" }] };
  const opportunities: CreativeOpportunity[] = [];
  const issues: OpportunityValidationIssue[] = [];
  const ids = new Set<string>();
  for (const item of candidates) {
    const candidate = item as Partial<CreativeOpportunity>;
    const opening = candidate.openingVisual;
    const evidence = candidate.evidenceStrategy;
    const valid = requiredText(candidate.id) && requiredText(candidate.targetAudience) && requiredText(candidate.useMoment)
      && requiredText(candidate.purchaseMotivation) && optionalText(candidate.tensionOrObjection)
      && requiredText(candidate.opportunity) && stringArray(candidate.contentMechanisms) && candidate.contentMechanisms!.length > 0
      && requiredText(candidate.creativeAngle) && requiredText(candidate.hookMechanism) && requiredText(candidate.hookLine)
      && opening && requiredText(opening.subject) && requiredText(opening.setup) && requiredText(opening.action)
      && optionalText(opening.visibleChangeOrQuestion)
      && evidence && evidenceTypes.has(evidence.type) && requiredText(evidence.objective)
      && stringArray(evidence.visualEvidence) && stringArray(evidence.limitations)
      && optionalText(candidate.creatorPersona) && optionalText(candidate.contentFormat)
      && requiredText(candidate.ctaDirection) && stringArray(candidate.riskNotes);
    if (!valid) {
      issues.push({ candidateId: requiredText(candidate.id) ? candidate.id : undefined, type: "schema", message: "Opportunity does not satisfy the CreativeOpportunity contract" });
      continue;
    }
    if (ids.has(candidate.id!)) {
      issues.push({ candidateId: candidate.id, type: "schema", message: "Opportunity IDs must be unique" });
      continue;
    }
    ids.add(candidate.id!);
    opportunities.push(candidate as CreativeOpportunity);
  }
  return { opportunities, issues };
}

function productKnowledge(input: CreativeBrainInput) {
  return input.productContext.productKnowledge;
}

function opportunityClaimText(item: CreativeOpportunity) {
  return JSON.stringify({
    targetAudience: item.targetAudience,
    useMoment: item.useMoment,
    purchaseMotivation: item.purchaseMotivation,
    tensionOrObjection: item.tensionOrObjection,
    opportunity: item.opportunity,
    contentMechanisms: item.contentMechanisms,
    creativeAngle: item.creativeAngle,
    hookMechanism: item.hookMechanism,
    hookLine: item.hookLine,
    openingVisual: item.openingVisual,
    evidenceObjective: item.evidenceStrategy.objective,
    visualEvidence: item.evidenceStrategy.visualEvidence,
    creatorPersona: item.creatorPersona,
    contentFormat: item.contentFormat,
    ctaDirection: item.ctaDirection,
  });
}

export function validateCreativeOpportunity(item: CreativeOpportunity, input: CreativeBrainInput): OpportunityValidationIssue[] {
  // Limitations and riskNotes describe what must not be claimed, so they are
  // deliberately excluded from the claim-validation surface.
  const text = opportunityClaimText(item);
  const knowledge = productKnowledge(input);
  const context = buildKnowledgeContext({
    product: input.productContext.productName,
    sellingPoints: knowledge?.sellingPoints || "",
    audience: knowledge?.audience || "",
    country: input.market,
    language: input.language,
    platform: input.platform,
    offer: knowledge?.offer || "",
    productKnowledge: knowledge,
    recent: input.recentCreativeHistory || [],
    complianceKnowledge: getGenerationComplianceKnowledge(),
  });
  const issues: OpportunityValidationIssue[] = [];
  for (const violation of findFactViolations(text, context)) issues.push({ candidateId: item.id, type: "truth", message: violation });
  for (const hit of checkCompliance(text).filter((entry) => entry.level === "高")) issues.push({ candidateId: item.id, type: "compliance", message: `${hit.category}:${hit.term}` });
  const unsupportedMedical = /(?:治愈|治疗|根治|修复疾病|杀菌|抗菌|cure|treat|heals?|kills? bacteria|medical(?:ly)? proven)/iu;
  if (unsupportedMedical.test(text) && !unsupportedMedical.test(Object.values(knowledge || {}).join(" "))) issues.push({ candidateId: item.id, type: "compliance", message: "Unsupported medical capability" });
  const truthText = normalize(Object.values(knowledge || {}).join(" "));
  const measuredClaims = [...text.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:seconds?|minutes?|hours?|secs?|mins?)\b|\d+(?:[.,]\d+)?\s*(?:秒|分钟|小时)/giu)].map((match) => match[0]);
  for (const claim of measuredClaims) if (!truthText.includes(normalize(claim))) issues.push({ candidateId: item.id, type: "truth", message: `Unsupported measured claim:${claim}` });
  const dangerous = /(?:真实?实验室|专业实验室认证|explos|爆炸|火烧|明火|高空抛|斧头|电钻|axe|drill|open flame)/iu;
  if (dangerous.test(text)) issues.push({ candidateId: item.id, type: "feasibility", message: "Unsafe or unavailable production requirement" });
  const unavailablePeople = /(?:名人|明星|医生出镜|专家出镜|celebrity|doctor appears|expert appears)/iu;
  if (unavailablePeople.test(text)) issues.push({ candidateId: item.id, type: "feasibility", message: "Requires an unavailable third party" });
  for (const recent of input.recentCreativeHistory || []) {
    const duplicateHook = recent.hook && similarity(item.hookLine, recent.hook) >= .72;
    const duplicateAngle = recent.creativeAngle && similarity(item.creativeAngle, recent.creativeAngle) >= .76;
    if (duplicateHook || duplicateAngle) issues.push({ candidateId: item.id, type: "history", message: duplicateHook ? "Duplicates a recent hook" : "Duplicates a recent creative angle" });
  }
  return issues;
}

function tokens(value: string) {
  return new Set(normalize(value).match(/.{1,3}/gu) || []);
}
function similarity(left: string, right: string) {
  const a = tokens(left), b = tokens(right);
  if (!a.size || !b.size) return 0;
  let same = 0;
  for (const value of a) if (b.has(value)) same++;
  return same / Math.min(a.size, b.size);
}

export function assessOpportunityDiversity(items: CreativeOpportunity[]) {
  const pairs: Array<{ left: number; right: number; similarDimensions: string[] }> = [];
  const dimensions: Array<[string, (item: CreativeOpportunity) => string, number]> = [
    ["creativeAngle", (item) => item.creativeAngle, .7],
    ["contentMechanisms", (item) => item.contentMechanisms.join(" "), .72],
    ["hookMechanism", (item) => item.hookMechanism, .75],
    ["openingVisual", (item) => Object.values(item.openingVisual).join(" "), .68],
    ["evidenceStrategy", (item) => `${item.evidenceStrategy.type} ${item.evidenceStrategy.objective}`, .72],
    ["useMoment", (item) => item.useMoment, .72],
  ];
  for (let left = 0; left < items.length; left++) for (let right = left + 1; right < items.length; right++) {
    const similar = dimensions.filter(([, read, threshold]) => similarity(read(items[left]), read(items[right])) >= threshold).map(([name]) => name);
    if (similar.length >= 4) pairs.push({ left, right, similarDimensions: similar });
  }
  return { passed: items.length >= 3 && items.length <= 5 && pairs.length === 0, pairs };
}

export function buildCreativeContext(input: CreativeBrainInput) {
  const count = Math.min(5, Math.max(3, input.candidateCount || 5));
  return {
    projectId: input.projectId,
    productTruth: { productName: input.productContext.productName, profileId: input.productContext.profileId, ...(productKnowledge(input) || {}) },
    market: { country: input.market, language: input.language, platform: input.platform },
    preferences: input.preferences || {},
    sourceContext: input.sourceContext || null,
    recentCreativeHistory: (input.recentCreativeHistory || []).slice(0, 6),
    candidateCount: count,
  };
}

type CreativeBrainRepairContext = {
  preserved: CreativeOpportunity[];
  missingCount: number;
  issues: OpportunityValidationIssue[];
};

export function creativeBrainMessages(input: CreativeBrainInput, repair?: CreativeBrainRepairContext) {
  const context = buildCreativeContext(input);
  const preferenceRule = "Preferences are steering signals, not hard templates. Consider them seriously, but propose a stronger direction when product truth and audience insight support it.";
  const repairInstruction = repair ? `\nThis is the only repair attempt. Return exactly ${repair.missingCount} replacement opportunities, not the complete set. Preserve these already-valid opportunities without repeating their directions: ${JSON.stringify(repair.preserved)}. Address these validation and diversity issues: ${JSON.stringify(repair.issues)}. Avoid the preserved creative angles, mechanisms, hook mechanisms, opening visuals, evidence strategies, and use moments. Use new unique IDs.` : "";
  return [
    { role: "system" as const, content: `You are ViralFlow Creative Brain. You are not writing the final script or a scene list. You decide creative strategy. For each opportunity determine WHO, WHEN, WHY THEY CARE, the tension, the watchable content mechanism, what viewers SEE first, what they HEAR or READ first, believable evidence or experience, and the direction toward action. Hook line and Opening Visual are separate. Opening Visual must name a concrete subject, setup, action, and optional visible change/question that a small production team can shoot. Do not invent product parameters, effects, prices, offers, certifications, medical benefits, test results, reviews, or third-party access. Do not default every candidate to Problem → Product → Demo → CTA. Category is context only; never map a category to a fixed hook, framework, or evidence type. Generate structurally distinct directions, not paraphrases. Use one to three relevant truths per direction instead of listing every selling point. CTA Direction is strategy, not final CTA copy. riskNotes may be empty and must only contain real risks. ${preferenceRule} Return strict JSON only: {"opportunities":[{"id":"A","targetAudience":"","useMoment":"","purchaseMotivation":"","tensionOrObjection":"","opportunity":"","contentMechanisms":[""],"creativeAngle":"","hookMechanism":"","hookLine":"","openingVisual":{"subject":"","setup":"","action":"","visibleChangeOrQuestion":""},"evidenceStrategy":{"type":"observable-demonstration|application|before-after|sensory|fit-movement|preparation|reaction|routine-context|comparison|education|testimonial|none-required","objective":"","visualEvidence":[""],"limitations":[""]},"creatorPersona":"","contentFormat":"","ctaDirection":"","riskNotes":[]}]}${repairInstruction}` },
    { role: "user" as const, content: JSON.stringify(context) },
  ];
}

function emptyMetadata(): CreativeBrainMetadata {
  return { providerRequested: null, providerUsed: null, model: null, candidateCount: 0, validCandidateCount: 0, repairAttempted: false, fallbackUsed: false, errorType: null, responseTimeMs: null };
}

export async function generateCreativeOpportunities(input: CreativeBrainInput, provider: CreativeBrainProvider): Promise<CreativeBrainResult> {
  const metadata = emptyMetadata();
  const allIssues: OpportunityValidationIssue[] = [];
  const requestedCount = buildCreativeContext(input).candidateCount;
  let preserved: CreativeOpportunity[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const missingCount = Math.max(0, requestedCount - preserved.length);
      const repair = attempt ? { preserved, missingCount: Math.max(1, missingCount), issues: [...allIssues] } : undefined;
      const response = await provider({ messages: creativeBrainMessages(input, repair), temperature: attempt ? .72 : .88, topP: .9, maxTokens: 5200, timeoutMs: 45_000 });
      metadata.providerRequested = response.providerRequested;
      metadata.providerUsed = response.providerUsed;
      metadata.model = response.model;
      metadata.responseTimeMs = (metadata.responseTimeMs || 0) + response.responseTimeMs;
      const parsed = parseCreativeOpportunities(response.content);
      allIssues.push(...parsed.issues);
      if (parsed.opportunities.length < 3 || parsed.opportunities.length > 5) allIssues.push({ type: "schema", message: "Creative Brain must return 3 to 5 opportunities" });
      const valid = parsed.opportunities.filter((item) => {
        const issues = validateCreativeOpportunity(item, input);
        allIssues.push(...issues);
        return issues.length === 0;
      });
      const combined = [...preserved];
      const ids = new Set(combined.map((item) => item.id));
      for (const item of valid) {
        if (ids.has(item.id)) {
          allIssues.push({ candidateId: item.id, type: "schema", message: "Repair candidate duplicates a preserved Opportunity ID" });
          continue;
        }
        ids.add(item.id);
        combined.push(item);
      }
      const candidateDiversity = assessOpportunityDiversity(combined);
      const duplicateIndices = new Set(candidateDiversity.pairs.map((pair) => pair.right));
      for (const pair of candidateDiversity.pairs) allIssues.push({ type: "diversity", message: `Candidates ${pair.left + 1} and ${pair.right + 1} are too similar: ${pair.similarDimensions.join(", ")}` });
      preserved = combined.filter((_, index) => !duplicateIndices.has(index)).slice(0, requestedCount);
      const diversity = assessOpportunityDiversity(preserved);
      metadata.candidateCount = combined.length;
      metadata.validCandidateCount = preserved.length;
      if (preserved.length >= 3 && preserved.length <= 5 && diversity.passed && preserved.length >= requestedCount) return { status: "success", opportunities: preserved, metadata, validationSummary: { issues: allIssues, diversityPassed: true } };
      if (attempt === 0) { metadata.repairAttempted = true; continue; }
      metadata.errorType = "insufficient_candidates";
      const partial = preserved.length > 0 && preserved.length <= 5;
      return { status: partial ? "partial" : "failure", opportunities: partial ? preserved : [], metadata, validationSummary: { issues: allIssues, diversityPassed: diversity.passed } };
    } catch (error) {
      metadata.errorType = error && typeof error === "object" && "category" in error ? (error as { category: ProviderErrorType }).category : "invalid_output";
      if (attempt === 0) { metadata.repairAttempted = true; continue; }
      metadata.candidateCount = preserved.length;
      metadata.validCandidateCount = preserved.length;
      const partial = preserved.length > 0;
      return { status: partial ? "partial" : "failure", opportunities: partial ? preserved : [], metadata, validationSummary: { issues: allIssues, diversityPassed: partial ? assessOpportunityDiversity(preserved).passed : false } };
    }
  }
  metadata.errorType = "insufficient_candidates";
  return { status: "failure", opportunities: [], metadata, validationSummary: { issues: allIssues, diversityPassed: false } };
}
