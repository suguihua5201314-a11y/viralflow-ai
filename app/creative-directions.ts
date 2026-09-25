import type { CreativeDirectionCandidate } from "./creative-contract";
import {
  CREATIVE_BRAIN_RUNTIME_BUDGET,
  creativeBrainErrorType,
  isCreativeBrainTransportFailure,
  type CreativeBrainInput,
  type CreativeBrainMetadata,
  type CreativeBrainProvider,
  type OpportunityValidationIssue,
} from "./creative-brain";
import { checkCompliance, getGenerationComplianceKnowledge } from "./compliance-rules";
import { buildKnowledgeContext, findFactViolations } from "./knowledge-context";

export const CREATIVE_DIRECTION_COUNT = 3;
export const CREATIVE_DIRECTION_MAX_TOKENS = 1200;

export type CreativeDirectionResult = {
  status: "success" | "partial" | "failure";
  directions: CreativeDirectionCandidate[];
  metadata: CreativeBrainMetadata;
  validationSummary: { issues: OpportunityValidationIssue[]; diversityPassed: boolean };
};

const requiredText = (value: unknown, max = 500) => typeof value === "string" && Boolean(value.trim()) && value.trim().length <= max;
const optionalText = (value: unknown, max = 500) => value === undefined || requiredText(value, max);
const normalize = (value: string) => value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");

export function parseCreativeDirections(content: string): { directions: CreativeDirectionCandidate[]; issues: OpportunityValidationIssue[] } {
  let value: unknown;
  try {
    value = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""));
  } catch {
    return { directions: [], issues: [{ type: "schema", message: "Creative Brain response is not valid JSON" }] };
  }
  const candidates = Array.isArray(value) ? value : (value as { directions?: unknown })?.directions;
  if (!Array.isArray(candidates)) return { directions: [], issues: [{ type: "schema", message: "directions must be an array" }] };
  const directions: CreativeDirectionCandidate[] = [];
  const issues: OpportunityValidationIssue[] = [];
  const ids = new Set<string>();
  for (const item of candidates) {
    const candidate = item as Partial<CreativeDirectionCandidate>;
    const opening = candidate.openingVisual;
    const valid = requiredText(candidate.id, 80) && requiredText(candidate.targetAudience) && requiredText(candidate.useMoment)
      && requiredText(candidate.coreMotivation) && optionalText(candidate.coreTension)
      && requiredText(candidate.creativeAngle) && requiredText(candidate.contentMechanism) && requiredText(candidate.hookLine)
      && opening && requiredText(opening.subject) && requiredText(opening.setup) && requiredText(opening.action)
      && optionalText(opening.visibleChangeOrQuestion) && optionalText(candidate.rationale);
    if (!valid) {
      issues.push({ candidateId: requiredText(candidate.id, 80) ? candidate.id : undefined, type: "schema", message: "Direction does not satisfy the CreativeDirectionCandidate contract" });
      continue;
    }
    if (ids.has(candidate.id!)) {
      issues.push({ candidateId: candidate.id, type: "schema", message: "Direction IDs must be unique" });
      continue;
    }
    ids.add(candidate.id!);
    directions.push(candidate as CreativeDirectionCandidate);
  }
  return { directions, issues };
}

function similarity(left: string, right: string) {
  const chunks = (value: string) => new Set(normalize(value).match(/.{1,3}/gu) || []);
  const a = chunks(left), b = chunks(right);
  if (!a.size || !b.size) return 0;
  let same = 0;
  for (const value of a) if (b.has(value)) same++;
  return same / Math.min(a.size, b.size);
}

export function assessDirectionDiversity(items: CreativeDirectionCandidate[]) {
  const pairs: Array<{ left: number; right: number; similarDimensions: string[] }> = [];
  const dimensions: Array<[string, (item: CreativeDirectionCandidate) => string, number]> = [
    ["audience", (item) => item.targetAudience, .75],
    ["moment", (item) => item.useMoment, .72],
    ["motivation", (item) => `${item.coreMotivation} ${item.coreTension || ""}`, .72],
    ["angle", (item) => item.creativeAngle, .7],
    ["mechanism", (item) => item.contentMechanism, .72],
    ["hook", (item) => item.hookLine, .72],
    ["visual", (item) => Object.values(item.openingVisual).join(" "), .68],
  ];
  for (let left = 0; left < items.length; left++) for (let right = left + 1; right < items.length; right++) {
    const similarDimensions = dimensions.filter(([, read, threshold]) => similarity(read(items[left]), read(items[right])) >= threshold).map(([name]) => name);
    if (similarDimensions.length >= 4) pairs.push({ left, right, similarDimensions });
  }
  return { passed: items.length === CREATIVE_DIRECTION_COUNT && pairs.length === 0, pairs };
}

export function buildCreativeDirectionContext(input: CreativeBrainInput) {
  return {
    productTruth: { productName: input.productContext.productName, profileId: input.productContext.profileId, ...(input.productContext.productKnowledge || {}) },
    market: { country: input.market, language: input.language, platform: input.platform },
    preferences: input.preferences || {},
    sourceContext: input.sourceContext || null,
    recentCreativeHistory: (input.recentCreativeHistory || []).slice(0, 6),
    candidateCount: CREATIVE_DIRECTION_COUNT,
  };
}

function directionText(item: CreativeDirectionCandidate) {
  return JSON.stringify({
    targetAudience: item.targetAudience, useMoment: item.useMoment, coreMotivation: item.coreMotivation,
    coreTension: item.coreTension, creativeAngle: item.creativeAngle, contentMechanism: item.contentMechanism,
    hookLine: item.hookLine, openingVisual: item.openingVisual, rationale: item.rationale,
  });
}

export function validateCreativeDirection(item: CreativeDirectionCandidate, input: CreativeBrainInput): OpportunityValidationIssue[] {
  const text = directionText(item);
  const knowledge = input.productContext.productKnowledge;
  const context = buildKnowledgeContext({
    product: input.productContext.productName, sellingPoints: knowledge?.sellingPoints || "", audience: knowledge?.audience || "",
    country: input.market, language: input.language, platform: input.platform, offer: knowledge?.offer || "",
    productKnowledge: knowledge, recent: input.recentCreativeHistory || [], complianceKnowledge: getGenerationComplianceKnowledge(),
  });
  const issues: OpportunityValidationIssue[] = [];
  for (const violation of findFactViolations(text, context)) issues.push({ candidateId: item.id, type: "truth", message: violation });
  for (const hit of checkCompliance(text).filter((entry) => entry.level === "高")) issues.push({ candidateId: item.id, type: "compliance", message: `${hit.category}:${hit.term}` });
  const truth = Object.values(knowledge || {}).join(" ");
  const unsupportedMedical = /(?:治愈|治疗|根治|修复疾病|杀菌|抗菌|cure|treat|heals?|kills? bacteria|medical(?:ly)? proven)/iu;
  if (unsupportedMedical.test(text) && !unsupportedMedical.test(truth)) issues.push({ candidateId: item.id, type: "compliance", message: "Unsupported medical capability" });
  const normalizedTruth = normalize(truth);
  const measured = [...text.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:seconds?|minutes?|hours?|secs?|mins?)\b|\d+(?:[.,]\d+)?\s*(?:秒|分钟|小时)/giu)].map((match) => match[0]);
  for (const claim of measured) if (!normalizedTruth.includes(normalize(claim))) issues.push({ candidateId: item.id, type: "truth", message: `Unsupported measured claim:${claim}` });
  if (/(?:真实?实验室|专业实验室认证|explos|爆炸|火烧|明火|高空抛|斧头|电钻|axe|drill|open flame)/iu.test(text)) issues.push({ candidateId: item.id, type: "feasibility", message: "Unsafe or unavailable production requirement" });
  if (/(?:名人|明星|医生出镜|专家出镜|celebrity|doctor appears|expert appears)/iu.test(text)) issues.push({ candidateId: item.id, type: "feasibility", message: "Requires an unavailable third party" });
  for (const recent of input.recentCreativeHistory || []) {
    const duplicateHook = recent.hook && similarity(item.hookLine, recent.hook) >= .72;
    const duplicateAngle = recent.creativeAngle && similarity(item.creativeAngle, recent.creativeAngle) >= .76;
    const duplicateMechanism = recent.proofMechanism && similarity(item.contentMechanism, recent.proofMechanism) >= .76;
    if (duplicateHook || duplicateAngle || duplicateMechanism) issues.push({ candidateId: item.id, type: "history", message: duplicateHook ? "Duplicates a recent hook" : duplicateAngle ? "Duplicates a recent creative angle" : "Duplicates a recent mechanism" });
  }
  return issues;
}

type RepairContext = { preserved: CreativeDirectionCandidate[]; missingCount: number; issues: OpportunityValidationIssue[] };

export function creativeDirectionMessages(input: CreativeBrainInput, repair?: RepairContext) {
  const repairInstruction = repair
    ? ` This is the only repair. Return ${repair.missingCount} replacement directions only. Do not repeat these valid directions: ${JSON.stringify(repair.preserved)}. Fix: ${JSON.stringify(repair.issues)}.`
    : "";
  return [
    { role: "system" as const, content: `You propose short-video creative directions, not scripts or full briefs. Return exactly ${repair?.missingCount || CREATIVE_DIRECTION_COUNT} structurally different, shootable directions. Decide who cares, when, why, the tension, angle, content mechanism, hook line, and first 1-3 second visual. Hook and visual must be distinct. Product truth is input context; never restate it as output or invent facts, numbers, prices, offers, certifications, medical effects, reviews, or third-party access. Preferences guide but do not dictate. Avoid recent hooks, angles, moments, and mechanisms. Return JSON only: {"directions":[{"id":"A","targetAudience":"","useMoment":"","coreMotivation":"","coreTension":"","creativeAngle":"","contentMechanism":"","hookLine":"","openingVisual":{"subject":"","setup":"","action":"","visibleChangeOrQuestion":""},"rationale":""}]}.${repairInstruction}` },
    { role: "user" as const, content: JSON.stringify(buildCreativeDirectionContext(input)) },
  ];
}

function emptyMetadata(): CreativeBrainMetadata {
  return { providerRequested: null, providerUsed: null, model: null, candidateCount: 0, validCandidateCount: 0, repairAttempted: false, fallbackUsed: false, errorType: null, responseTimeMs: null };
}

export async function generateCreativeDirections(input: CreativeBrainInput, provider: CreativeBrainProvider): Promise<CreativeDirectionResult> {
  const metadata = emptyMetadata();
  const allIssues: OpportunityValidationIssue[] = [];
  let preserved: CreativeDirectionCandidate[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const repair = attempt ? { preserved, missingCount: Math.max(1, CREATIVE_DIRECTION_COUNT - preserved.length), issues: [...allIssues] } : undefined;
      const response = await provider({
        messages: creativeDirectionMessages(input, repair), temperature: attempt ? .65 : .82, topP: .9,
        maxTokens: CREATIVE_DIRECTION_MAX_TOKENS,
        timeoutMs: attempt ? CREATIVE_BRAIN_RUNTIME_BUDGET.repairProviderTimeoutMs : CREATIVE_BRAIN_RUNTIME_BUDGET.initialProviderTimeoutMs,
      });
      metadata.providerRequested = response.providerRequested; metadata.providerUsed = response.providerUsed;
      metadata.model = response.model; metadata.responseTimeMs = (metadata.responseTimeMs || 0) + response.responseTimeMs;
      const parsed = parseCreativeDirections(response.content);
      allIssues.push(...parsed.issues);
      if (!attempt && parsed.directions.length !== CREATIVE_DIRECTION_COUNT) allIssues.push({ type: "schema", message: "Creative Brain must return exactly 3 directions" });
      const valid = parsed.directions.filter((item) => {
        const issues = validateCreativeDirection(item, input); allIssues.push(...issues); return issues.length === 0;
      });
      const combined = [...preserved];
      const ids = new Set(combined.map((item) => item.id));
      for (const item of valid) {
        if (ids.has(item.id)) { allIssues.push({ candidateId: item.id, type: "schema", message: "Repair candidate duplicates a preserved Direction ID" }); continue; }
        ids.add(item.id); combined.push(item);
      }
      const candidateDiversity = assessDirectionDiversity(combined.slice(0, CREATIVE_DIRECTION_COUNT));
      const duplicates = new Set(candidateDiversity.pairs.map((pair) => pair.right));
      for (const pair of candidateDiversity.pairs) allIssues.push({ type: "diversity", message: `Directions ${pair.left + 1} and ${pair.right + 1} are too similar: ${pair.similarDimensions.join(", ")}` });
      preserved = combined.filter((_, index) => !duplicates.has(index)).slice(0, CREATIVE_DIRECTION_COUNT);
      const diversity = assessDirectionDiversity(preserved);
      metadata.candidateCount = combined.length; metadata.validCandidateCount = preserved.length;
      if (preserved.length === CREATIVE_DIRECTION_COUNT && diversity.passed) return { status: "success", directions: preserved, metadata, validationSummary: { issues: allIssues, diversityPassed: true } };
      if (!attempt) { metadata.repairAttempted = true; continue; }
      metadata.errorType = "insufficient_candidates";
      return { status: preserved.length ? "partial" : "failure", directions: preserved, metadata, validationSummary: { issues: allIssues, diversityPassed: diversity.passed } };
    } catch (error) {
      metadata.errorType = creativeBrainErrorType(error);
      if (!attempt && !isCreativeBrainTransportFailure(error)) { metadata.repairAttempted = true; continue; }
      metadata.candidateCount = preserved.length; metadata.validCandidateCount = preserved.length;
      return { status: preserved.length ? "partial" : "failure", directions: preserved, metadata, validationSummary: { issues: allIssues, diversityPassed: preserved.length ? assessDirectionDiversity(preserved).passed : false } };
    }
  }
  metadata.errorType = "insufficient_candidates";
  return { status: "failure", directions: [], metadata, validationSummary: { issues: allIssues, diversityPassed: false } };
}

function safeErrorMessage(status: number, errorType?: string | null) {
  return status === 504 || errorType === "timeout" ? "创意方向生成超时，请重试。" : "创意方向生成失败，请重试。";
}

export async function parseCreativeDirectionApiResponse(response: Response): Promise<CreativeDirectionResult> {
  const isJson = response.headers.get("content-type")?.toLowerCase().includes("application/json");
  if (!isJson) { await response.text().catch(() => ""); throw new Error(safeErrorMessage(response.status)); }
  let data: unknown;
  try { data = await response.json(); } catch { throw new Error(safeErrorMessage(response.status)); }
  const value = data as Partial<CreativeDirectionResult> & { error?: string | { type?: string; message?: string } };
  const errorType = typeof value.error === "object" ? value.error.type : value.metadata?.errorType;
  if (!response.ok || value.status === "failure") throw new Error(typeof value.error === "object" && value.error.message ? value.error.message : safeErrorMessage(response.status, errorType));
  return value as CreativeDirectionResult;
}
