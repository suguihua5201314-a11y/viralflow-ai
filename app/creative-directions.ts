import type { CreativeDirectionCandidate } from "./creative-contract";
import {
  CREATIVE_BRAIN_RUNTIME_BUDGET,
  creativeBrainErrorType,
  isCreativeBrainTransportFailure,
  resolveCreativeBrainLanguageContext,
  type CreativeBrainInput,
  type CreativeBrainMetadata,
  type CreativeBrainProvider,
  type OpportunityValidationIssue,
} from "./creative-brain";
import { checkCompliance, getGenerationComplianceKnowledge } from "./compliance-rules";
import { buildKnowledgeContext, findFactViolationDiagnostics, findFactViolations } from "./knowledge-context";
import { validateInternalCreativeLanguage } from "./creation-language-context";
import { productContextFingerprint } from "./creative-opportunity-selection";
import { validateCreativeDirectionProductGrounding } from "./product-claim-grounding";

export const CREATIVE_DIRECTION_COUNT = 3;
export const CREATIVE_DIRECTION_MAX_TOKENS = 1200;

export type CreativeDirectionResult = {
  status: "success" | "partial" | "failure";
  directions: CreativeDirectionCandidate[];
  metadata: CreativeBrainMetadata;
  validationSummary: { issues: OpportunityValidationIssue[]; diversityPassed: boolean };
  validationDiagnostics?: CreativeDirectionValidationDiagnostics;
};

export type CreativeCandidateDiagnosticIssue = {
  stage: OpportunityValidationIssue["type"] | "candidate_pool";
  issueCode: string;
  path: string | null;
  ruleFamily?: string;
  ruleCode?: string;
};

export type CreativeRepairPropagationDiagnostic = CreativeCandidateDiagnosticIssue & {
  candidateId: string;
  repairReceived: boolean;
  receivedFields: Array<"stage" | "issueCode" | "ruleFamily" | "ruleCode" | "path">;
};

export type CreativeCandidateDiagnostic = {
  candidateId: string;
  source: "initial" | "repair" | "preserved";
  outcome: "valid" | "rejected" | "deduplicated" | "preserved";
  issues: CreativeCandidateDiagnosticIssue[];
};

export type CreativeDirectionAttemptDiagnostic = {
  attempt: 0 | 1;
  receivedCandidateCount: number;
  parsedCandidateCount: number;
  validCandidateCount: number;
  rejectedCandidateCount: number;
  preservedCandidateCount: number;
  diversityPassed: boolean;
  candidates: CreativeCandidateDiagnostic[];
};

export type CreativeDirectionValidationDiagnostics = {
  attempts: CreativeDirectionAttemptDiagnostic[];
  terminalReason: CreativeBrainMetadata["errorType"];
};

export type CreativeDirectionValidationObserver = (diagnostic: CreativeDirectionAttemptDiagnostic) => void;
export type CreativeDirectionRepairObserver = (diagnostic: { attempt: 1; issues: CreativeRepairPropagationDiagnostic[] }) => void;

export function validateGroundedCreativeBrainInput(input: CreativeBrainInput): OpportunityValidationIssue[] {
  const issues: OpportunityValidationIssue[] = [];
  const knowledge = input.productContext.productKnowledge;
  if (!knowledge) issues.push({ type: "grounding", code: "missing_product_truth", path: "productContext.productKnowledge", message: "Canonical Product Truth is required" });
  if (input.productContext.profileId == null) issues.push({ type: "grounding", code: "missing_product_truth", path: "productContext.profileId", message: "Canonical Product Profile is required" });
  if (input.productBinding?.projectProductName !== input.productContext.productName) issues.push({ type: "grounding", code: "product_identity_mismatch", path: "productBinding.projectProductName", message: "Project product must match Product Context" });
  if (input.productBinding?.projectProductProfileId !== input.productContext.profileId) issues.push({ type: "grounding", code: "product_identity_mismatch", path: "productBinding.projectProductProfileId", message: "Project profile must match Product Context" });
  if (input.productContextFingerprint !== productContextFingerprint(input.productContext)) issues.push({ type: "grounding", code: "product_context_fingerprint_mismatch", path: "productContextFingerprint", message: "Product Context fingerprint does not match canonical facts" });
  return issues;
}

const requiredText = (value: unknown, max = 500) => typeof value === "string" && Boolean(value.trim()) && value.trim().length <= max;
const optionalText = (value: unknown, max = 500) => value === undefined || requiredText(value, max);
const normalize = (value: string) => value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");

export function parseCreativeDirections(content: string): { directions: CreativeDirectionCandidate[]; issues: OpportunityValidationIssue[]; receivedCandidateCount: number } {
  let value: unknown;
  try {
    value = JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, ""));
  } catch {
    return { directions: [], issues: [{ type: "schema", message: "Creative Brain response is not valid JSON" }], receivedCandidateCount: 0 };
  }
  const candidates = Array.isArray(value) ? value : (value as { directions?: unknown })?.directions;
  if (!Array.isArray(candidates)) return { directions: [], issues: [{ type: "schema", message: "directions must be an array" }], receivedCandidateCount: 0 };
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
  return { directions, issues, receivedCandidateCount: candidates.length };
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
  const languageContext = resolveCreativeBrainLanguageContext(input);
  return {
    productTruth: { productName: input.productContext.productName, profileId: input.productContext.profileId, ...(input.productContext.productKnowledge || {}) },
    workspaceLanguage: languageContext.workspaceLanguage,
    audienceContext: { market: languageContext.market, targetLanguage: languageContext.targetLanguage, platform: languageContext.platform },
    languageInstruction: "All human-readable Creative Direction fields are internal working content and must be written in Simplified Chinese. targetLanguage is a future localization target only.",
    preferences: input.preferences || {},
    sourceContext: input.sourceContext || null,
    recentCreativeHistory: (input.recentCreativeHistory || []).slice(0, 6),
    candidateCount: CREATIVE_DIRECTION_COUNT,
  };
}

function directionLanguageFields(item: CreativeDirectionCandidate) {
  return [
    { path: "targetAudience", text: item.targetAudience }, { path: "useMoment", text: item.useMoment },
    { path: "coreMotivation", text: item.coreMotivation }, { path: "coreTension", text: item.coreTension },
    { path: "creativeAngle", text: item.creativeAngle }, { path: "contentMechanism", text: item.contentMechanism },
    { path: "hookLine", text: item.hookLine }, { path: "openingVisual.subject", text: item.openingVisual.subject },
    { path: "openingVisual.setup", text: item.openingVisual.setup }, { path: "openingVisual.action", text: item.openingVisual.action },
    { path: "openingVisual.visibleChangeOrQuestion", text: item.openingVisual.visibleChangeOrQuestion },
    { path: "rationale", text: item.rationale },
  ];
}

function directionText(item: CreativeDirectionCandidate) {
  return JSON.stringify({
    targetAudience: item.targetAudience, useMoment: item.useMoment, coreMotivation: item.coreMotivation,
    coreTension: item.coreTension, creativeAngle: item.creativeAngle, contentMechanism: item.contentMechanism,
    hookLine: item.hookLine, openingVisual: item.openingVisual, rationale: item.rationale,
  });
}

function uniqueDiagnosticPath(item: CreativeDirectionCandidate, matches: (text: string) => boolean) {
  const paths = directionLanguageFields(item).filter((field) => field.text && matches(field.text)).map((field) => field.path);
  return paths.length === 1 ? paths[0] : undefined;
}

export function validateCreativeDirection(item: CreativeDirectionCandidate, input: CreativeBrainInput): OpportunityValidationIssue[] {
  const text = directionText(item);
  const knowledge = input.productContext.productKnowledge;
  const languageContext = resolveCreativeBrainLanguageContext(input);
  const context = buildKnowledgeContext({
    product: input.productContext.productName, sellingPoints: knowledge?.sellingPoints || "", audience: knowledge?.audience || "",
    country: languageContext.market, language: languageContext.targetLanguage, platform: languageContext.platform, offer: knowledge?.offer || "",
    productKnowledge: knowledge, recent: input.recentCreativeHistory || [], complianceKnowledge: getGenerationComplianceKnowledge(),
  });
  const issues: OpportunityValidationIssue[] = [];
  if (input.languageContext || input.workspaceLanguage || input.targetLanguage) {
    for (const mismatch of validateInternalCreativeLanguage(directionLanguageFields(item), languageContext.workspaceLanguage)) {
      issues.push({ candidateId: item.id, type: "language", message: `${mismatch.code}:${mismatch.path}` });
    }
  }
  const factDiagnostics = findFactViolationDiagnostics(text, context);
  for (const violation of findFactViolations(text, context)) {
    const diagnostic = factDiagnostics.find((entry) => entry.message === violation);
    const path = diagnostic ? uniqueDiagnosticPath(item, (fieldText) => findFactViolationDiagnostics(fieldText, context).some((entry) => entry.ruleFamily === diagnostic.ruleFamily && entry.ruleCode === diagnostic.ruleCode && entry.message === diagnostic.message)) : undefined;
    issues.push({ candidateId: item.id, type: "truth", message: violation, ...(diagnostic ? { ruleFamily: diagnostic.ruleFamily, ruleCode: diagnostic.ruleCode } : {}), ...(path ? { diagnosticPath: path } : {}) });
  }
  for (const issue of validateCreativeDirectionProductGrounding(item, input.productContext)) {
    issues.push({ candidateId: item.id, type: "grounding", ...issue, ruleFamily: "product_claim_grounding", ruleCode: issue.code, message: issue.code });
  }
  for (const hit of checkCompliance(text).filter((entry) => entry.level === "高")) {
    const path = uniqueDiagnosticPath(item, (fieldText) => checkCompliance(fieldText).some((entry) => entry.level === "高" && entry.ruleFamily === hit.ruleFamily && entry.ruleCode === hit.ruleCode && entry.term === hit.term));
    issues.push({ candidateId: item.id, type: "compliance", message: `${hit.category}:${hit.term}`, ...(hit.ruleFamily ? { ruleFamily: hit.ruleFamily } : {}), ...(hit.ruleCode ? { ruleCode: hit.ruleCode } : {}), ...(path ? { diagnosticPath: path } : {}) });
  }
  const truth = Object.values(knowledge || {}).join(" ");
  const unsupportedMedical = /(?:治愈|治疗|根治|修复疾病|杀菌|抗菌|cure|treat|heals?|kills? bacteria|medical(?:ly)? proven)/iu;
  if (unsupportedMedical.test(text) && !unsupportedMedical.test(truth)) issues.push({ candidateId: item.id, type: "compliance", ruleFamily: "medical_claim", ruleCode: "unsupported_medical_capability", diagnosticPath: uniqueDiagnosticPath(item, (fieldText) => unsupportedMedical.test(fieldText)), message: "Unsupported medical capability" });
  const normalizedTruth = normalize(truth);
  const measured = [...text.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:seconds?|minutes?|hours?|secs?|mins?)\b|\d+(?:[.,]\d+)?\s*(?:秒|分钟|小时)/giu)].map((match) => match[0]);
  for (const claim of measured) if (!normalizedTruth.includes(normalize(claim))) issues.push({ candidateId: item.id, type: "truth", ruleFamily: "measured_claim", ruleCode: "unsupported_duration_measurement", diagnosticPath: uniqueDiagnosticPath(item, (fieldText) => fieldText.includes(claim)), message: `Unsupported measured claim:${claim}` });
  if (/(?:真实?实验室|专业实验室认证|explos|爆炸|火烧|明火|高空抛|斧头|电钻|axe|drill|open flame)/iu.test(text)) issues.push({ candidateId: item.id, type: "feasibility", message: "Unsafe or unavailable production requirement" });
  if (/(?:名人|明星|医生出镜|专家出镜|celebrity|doctor appears|expert appears)/iu.test(text)) issues.push({ candidateId: item.id, type: "feasibility", message: "Requires an unavailable third party" });
  for (const recent of input.recentCreativeHistory || []) {
    const duplicateHook = recent.hook && similarity(item.hookLine, recent.hook) >= .72;
    const duplicateAngle = recent.creativeAngle && similarity(item.creativeAngle, recent.creativeAngle) >= .76;
    const duplicateMechanism = recent.proofMechanism && similarity(item.contentMechanism, recent.proofMechanism) >= .76;
    if (duplicateHook || duplicateAngle || duplicateMechanism) issues.push({ candidateId: item.id, type: "history", ruleFamily: "history_repetition", ruleCode: duplicateHook ? "duplicate_recent_hook" : duplicateAngle ? "duplicate_recent_angle" : "duplicate_recent_mechanism", diagnosticPath: duplicateHook ? "hookLine" : duplicateAngle ? "creativeAngle" : "contentMechanism", message: duplicateHook ? "Duplicates a recent hook" : duplicateAngle ? "Duplicates a recent creative angle" : "Duplicates a recent mechanism" });
  }
  return issues;
}

type RepairContext = { preserved: CreativeDirectionCandidate[]; correctionCandidates: CreativeDirectionCandidate[]; missingCount: number; issues: OpportunityValidationIssue[] };

function existingRepairIssueShape(issue: OpportunityValidationIssue) {
  return {
    ...(issue.candidateId ? { candidateId: issue.candidateId } : {}),
    type: issue.type,
    ...(issue.code ? { code: issue.code } : {}),
    ...(issue.path ? { path: issue.path } : {}),
    ...(issue.capabilityFamily ? { capabilityFamily: issue.capabilityFamily } : {}),
    message: issue.message,
  };
}

export function creativeDirectionMessages(input: CreativeBrainInput, repair?: RepairContext) {
  const repairInstruction = repair
    ? repair.correctionCandidates.length
      ? ` One repair only. Return ${repair.missingCount} corrected directions only. Re-express these wrong-language directions in Simplified Chinese without changing their IDs. Keep these candidate IDs and their audience, moment, angle, mechanism, and strategy identity: ${JSON.stringify(repair.correctionCandidates)}. Correct only the listed language or Product Truth grounding issues. Delete or narrow unsupported assertions, or replace them only with facts present in productTruth. Do not invent facts. Do not repeat or rewrite preserved candidates: ${JSON.stringify(repair.preserved)}. Safe issues (candidateId, code, path, capabilityFamily): ${JSON.stringify(repair.issues.map(({candidateId,code,path,capabilityFamily,type})=>({candidateId,code,path,capabilityFamily,type})))}.`
      : ` This is the only repair. Return ${repair.missingCount} replacement directions only. Do not repeat: ${JSON.stringify(repair.preserved)}. Fix: ${JSON.stringify(repair.issues.map(existingRepairIssueShape))}.`
    : "";
  return [
    { role: "system" as const, content: `Generate exactly ${repair?.missingCount || CREATIVE_DIRECTION_COUNT} distinct directions, not scripts/briefs. All human-readable fields use Simplified Chinese; market/targetLanguage are future-localization constraints only. Cover audience, moment, motivation, tension, angle, mechanism, hook and first 1-3s visual. Keep hook/visual distinct. Product Truth is the strict fact boundary. Never invent facts, numbers, price/offer, certification, medical effects, reviews or third-party access. A capability does not authorize stronger results, duration guarantees, competitor facts or superiority. Scenario time and comparison mechanisms are allowed; product-effect duration/comparative conclusions require explicit Product Truth. Preferences guide but do not dictate. Avoid recent ideas. JSON only: {"directions":[{"id":"A","targetAudience":"","useMoment":"","coreMotivation":"","coreTension":"","creativeAngle":"","contentMechanism":"","hookLine":"","openingVisual":{"subject":"","setup":"","action":"","visibleChangeOrQuestion":""},"rationale":""}]}.${repairInstruction}` },
    { role: "user" as const, content: JSON.stringify(buildCreativeDirectionContext(input)) },
  ];
}

function emptyMetadata(): CreativeBrainMetadata {
  return { providerRequested: null, providerUsed: null, model: null, candidateCount: 0, validCandidateCount: 0, repairAttempted: false, fallbackUsed: false, errorType: null, responseTimeMs: null };
}

function safeCandidateId(candidateId: string | undefined) {
  return candidateId && /^[A-Za-z0-9_-]{1,40}$/.test(candidateId) ? candidateId : "unidentified";
}

function safeDiagnosticIssue(issue: OpportunityValidationIssue): CreativeCandidateDiagnosticIssue {
  const diagnosticPath = issue.path || issue.diagnosticPath;
  const metadata = { path: diagnosticPath || null, ...(issue.ruleFamily ? { ruleFamily: issue.ruleFamily } : {}), ...(issue.ruleCode ? { ruleCode: issue.ruleCode } : {}) };
  if (issue.code) return { stage: issue.type, issueCode: issue.code, ...metadata };
  if (issue.type === "language") {
    const separator = issue.message.indexOf(":");
    return { stage: "language", issueCode: separator > 0 ? issue.message.slice(0, separator) : "invalid_workspace_language", path: separator > 0 ? issue.message.slice(separator + 1) : null };
  }
  const issueCode = issue.type === "schema"
    ? issue.message === "Creative Brain response is not valid JSON" ? "invalid_json"
      : issue.message === "directions must be an array" ? "invalid_top_level"
        : issue.message === "Direction IDs must be unique" ? "duplicate_candidate_id"
          : issue.message === "Creative Brain must return exactly 3 directions" ? "candidate_count_mismatch"
            : issue.message === "Repair candidate duplicates a preserved Direction ID" ? "duplicate_preserved_id"
              : "invalid_candidate_contract"
    : issue.type === "truth" ? issue.message.startsWith("Unsupported measured claim:") ? "unsupported_measured_claim" : "fact_violation"
      : issue.type === "compliance" ? issue.message === "Unsupported medical capability" ? "unsupported_medical_capability" : "high_risk_compliance"
        : issue.type === "history" ? issue.message === "Duplicates a recent hook" ? "duplicate_recent_hook" : issue.message === "Duplicates a recent creative angle" ? "duplicate_recent_angle" : "duplicate_recent_mechanism"
          : issue.type === "feasibility" ? issue.message === "Requires an unavailable third party" ? "unavailable_third_party" : "unsafe_production_requirement"
            : issue.type === "diversity" ? "insufficient_diversity" : `${issue.type}_validation_failed`;
  return { stage: issue.type, issueCode, ...metadata };
}

function repairPropagationDiagnostics(issues: OpportunityValidationIssue[]): CreativeRepairPropagationDiagnostic[] {
  return issues.map((issue) => {
    const safe = safeDiagnosticIssue(issue);
    const receivedFields: CreativeRepairPropagationDiagnostic["receivedFields"] = ["stage"];
    if (issue.code) receivedFields.push("issueCode");
    if (issue.path) receivedFields.push("path");
    return { candidateId: safeCandidateId(issue.candidateId), ...safe, repairReceived: Boolean(safe.ruleFamily ? receivedFields.includes("ruleFamily") : true) && Boolean(safe.ruleCode ? receivedFields.includes("ruleCode") : true) && Boolean(safe.path ? receivedFields.includes("path") : true), receivedFields };
  });
}

function diagnosticCandidate(candidateId: string | undefined, source: CreativeCandidateDiagnostic["source"], outcome: CreativeCandidateDiagnostic["outcome"], issues: OpportunityValidationIssue[] = []): CreativeCandidateDiagnostic {
  return { candidateId: safeCandidateId(candidateId), source, outcome, issues: issues.map(safeDiagnosticIssue) };
}

export async function generateCreativeDirections(
  input: CreativeBrainInput,
  provider: CreativeBrainProvider,
  options: { observe?: CreativeDirectionValidationObserver; observeRepair?: CreativeDirectionRepairObserver } = {},
): Promise<CreativeDirectionResult> {
  const metadata = emptyMetadata();
  const allIssues: OpportunityValidationIssue[] = [];
  const attempts: CreativeDirectionAttemptDiagnostic[] = [];
  const resultDiagnostics = (): CreativeDirectionValidationDiagnostics => ({ attempts, terminalReason: metadata.errorType });
  let preserved: CreativeDirectionCandidate[] = [];
  const inputIssues = validateGroundedCreativeBrainInput(input);
  if (inputIssues.length) return { status: "failure", directions: [], metadata: { ...metadata, errorType: "invalid_output" }, validationSummary: { issues: inputIssues, diversityPassed: false }, validationDiagnostics: { attempts, terminalReason: "invalid_output" } };
  let correctionCandidates: CreativeDirectionCandidate[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const repair = attempt ? { preserved, correctionCandidates, missingCount: correctionCandidates.length || Math.max(1, CREATIVE_DIRECTION_COUNT - preserved.length), issues: [...allIssues] } : undefined;
      if (repair) options.observeRepair?.({ attempt: 1, issues: repairPropagationDiagnostics(repair.issues) });
      const response = await provider({
        messages: creativeDirectionMessages(input, repair), temperature: attempt ? .65 : .82, topP: .9,
        maxTokens: CREATIVE_DIRECTION_MAX_TOKENS,
        timeoutMs: attempt ? CREATIVE_BRAIN_RUNTIME_BUDGET.repairProviderTimeoutMs : CREATIVE_BRAIN_RUNTIME_BUDGET.initialProviderTimeoutMs,
      });
      metadata.providerRequested = response.providerRequested; metadata.providerUsed = response.providerUsed;
      metadata.model = response.model; metadata.responseTimeMs = (metadata.responseTimeMs || 0) + response.responseTimeMs;
      const parsed = parseCreativeDirections(response.content);
      allIssues.push(...parsed.issues);
      const attemptCandidates: CreativeCandidateDiagnostic[] = preserved.map((item) => diagnosticCandidate(item.id, "preserved", "preserved"));
      attemptCandidates.push(...parsed.issues.map((issue) => diagnosticCandidate(issue.candidateId, attempt ? "repair" : "initial", "rejected", [issue])));
      if (!attempt && parsed.directions.length !== CREATIVE_DIRECTION_COUNT) {
        const countIssue: OpportunityValidationIssue = { type: "schema", message: "Creative Brain must return exactly 3 directions" };
        allIssues.push(countIssue);
        attemptCandidates.push(diagnosticCandidate(undefined, "initial", "rejected", [countIssue]));
      }
      let valid = parsed.directions.filter((item) => {
        const issues = validateCreativeDirection(item, input);
        allIssues.push(...issues);
        attemptCandidates.push(diagnosticCandidate(item.id, attempt ? "repair" : "initial", issues.length ? "rejected" : "valid", issues));
        if (!attempt && issues.length > 0 && issues.every((entry) => entry.type === "language" || entry.type === "grounding")) correctionCandidates.push(item);
        return issues.length === 0;
      });
      if (attempt && correctionCandidates.length) {
        const returnedIds = new Set(valid.map((item) => item.id));
        for (const candidate of correctionCandidates) if (!returnedIds.has(candidate.id)) {
          const issue: OpportunityValidationIssue = { candidateId: candidate.id, type: "grounding", code: "repair_identity_mismatch", path: "id", message: "Grounding repair must preserve Direction ID and strategy identity" };
          allIssues.push(issue);
          attemptCandidates.push(diagnosticCandidate(candidate.id, "repair", "rejected", [issue]));
        }
        if (correctionCandidates.length === repair!.missingCount) {
          const expectedIds = new Set(correctionCandidates.map((item) => item.id));
          valid = valid.filter((item) => expectedIds.has(item.id));
        }
      }
      const combined = [...preserved];
      const ids = new Set(combined.map((item) => item.id));
      for (const item of valid) {
        if (ids.has(item.id)) {
          const issue: OpportunityValidationIssue = { candidateId: item.id, type: "schema", message: "Repair candidate duplicates a preserved Direction ID" };
          allIssues.push(issue);
          attemptCandidates.push(diagnosticCandidate(item.id, attempt ? "repair" : "initial", "deduplicated", [issue]));
          continue;
        }
        ids.add(item.id); combined.push(item);
      }
      const candidateDiversity = assessDirectionDiversity(combined.slice(0, CREATIVE_DIRECTION_COUNT));
      const duplicates = new Set(candidateDiversity.pairs.map((pair) => pair.right));
      for (const pair of candidateDiversity.pairs) {
        const duplicate = combined[pair.right];
        const issue: OpportunityValidationIssue = { candidateId: duplicate?.id, type: "diversity", code: "insufficient_diversity", path: duplicate ? `directions.${safeCandidateId(duplicate.id)}` : "directions", message: `Directions ${pair.left + 1} and ${pair.right + 1} are too similar: ${pair.similarDimensions.join(", ")}` };
        allIssues.push(issue);
        attemptCandidates.push(diagnosticCandidate(duplicate?.id, attempt ? "repair" : "initial", "deduplicated", [issue]));
      }
      preserved = combined.filter((_, index) => !duplicates.has(index)).slice(0, CREATIVE_DIRECTION_COUNT);
      const diversity = assessDirectionDiversity(preserved);
      metadata.candidateCount = combined.length; metadata.validCandidateCount = preserved.length;
      const validReturnedIds = new Set(valid.map((item) => item.id));
      const rejectedReturnedCount = parsed.directions.filter((item) => !validReturnedIds.has(item.id)).length + Math.max(0, parsed.receivedCandidateCount - parsed.directions.length);
      const attemptDiagnostic: CreativeDirectionAttemptDiagnostic = {
        attempt: attempt as 0 | 1,
        receivedCandidateCount: parsed.receivedCandidateCount,
        parsedCandidateCount: parsed.directions.length,
        validCandidateCount: valid.length,
        rejectedCandidateCount: rejectedReturnedCount,
        preservedCandidateCount: preserved.length,
        diversityPassed: diversity.passed,
        candidates: attemptCandidates,
      };
      attempts.push(attemptDiagnostic);
      options.observe?.(attemptDiagnostic);
      if (preserved.length === CREATIVE_DIRECTION_COUNT && diversity.passed) return { status: "success", directions: preserved, metadata, validationSummary: { issues: allIssues, diversityPassed: true }, validationDiagnostics: resultDiagnostics() };
      if (!attempt) { metadata.repairAttempted = true; continue; }
      metadata.errorType = "insufficient_candidates";
      return { status: preserved.length ? "partial" : "failure", directions: preserved, metadata, validationSummary: { issues: allIssues, diversityPassed: diversity.passed }, validationDiagnostics: resultDiagnostics() };
    } catch (error) {
      metadata.errorType = creativeBrainErrorType(error);
      if (!attempt && !isCreativeBrainTransportFailure(error)) { metadata.repairAttempted = true; continue; }
      metadata.candidateCount = preserved.length; metadata.validCandidateCount = preserved.length;
      return { status: preserved.length ? "partial" : "failure", directions: preserved, metadata, validationSummary: { issues: allIssues, diversityPassed: preserved.length ? assessDirectionDiversity(preserved).passed : false }, validationDiagnostics: resultDiagnostics() };
    }
  }
  metadata.errorType = "insufficient_candidates";
  return { status: "failure", directions: [], metadata, validationSummary: { issues: allIssues, diversityPassed: false }, validationDiagnostics: resultDiagnostics() };
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
