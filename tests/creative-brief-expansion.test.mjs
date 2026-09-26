import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const api = await jiti.import("../app/creative-brief-expansion.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");

const productContext = { productName: "CrystalArmor", profileId: 7, productKnowledge: { id: 7, name: "CrystalArmor", sellingPoints: "privacy viewing; alignment applicator", parameters: "28 degree viewing angle", bannedWords: "100% unbreakable", notes: "Avoid destructive tests" } };
const selectedDirection = selection.canonicalizeCreativeDirection({
  id: "candidate-a", targetAudience: "commuters", useMoment: "on a train", coreMotivation: "reduce casual side viewing", coreTension: "public visibility",
  creativeAngle: "show what the next seat can see", contentMechanism: "point-of-view switch", hookLine: "What changes from the next seat?",
  openingVisual: { subject: "phone", setup: "train seat", action: "camera moves from front to side", visibleChangeOrQuestion: "the visible screen changes" }, rationale: "makes privacy tangible",
}, "creative-opportunity-stable");
const fingerprint = selection.productContextFingerprint(productContext);
const input = { projectId: "project-a", selectedDirection, productContext, productContextFingerprint: fingerprint, market: "Spain", language: "Spanish", platform: "TikTok", preferences: { creativity: "high" } };
const expansion = { hookMechanism: "visual question", evidenceStrategy: { type: "routine-context", objective: "show an ordinary viewing angle", visualEvidence: ["camera changes seats"], limitations: ["do not imply total privacy"] }, ctaDirection: "invite viewers to check compatibility", riskBoundaries: { prohibitedClaims: [], requiredQualifiers: ["results depend on viewing angle"], safetyConstraints: ["avoid destructive tests"] }, creatorPersona: "commuter", contentFormat: "observational diary", spokenTone: "curious" };
const response = value => ({ content: JSON.stringify({ expansion: value }), providerRequested: "deepseek", providerUsed: "deepseek", model: "configured-model", responseTimeMs: 10 });
const project = id => ({ id, name: id, product: "CrystalArmor", market: "Spain", platform: "TikTok", language: "Spanish", stage: "脚本", createdAt: "2026-09-25T00:00:00.000Z", updatedAt: "2026-09-25T00:00:00.000Z", assets: { scriptVersions: [] } });
const memory = () => ({ version: 1, memoryRevision: 8, writerId: "old", updatedAt: "2026-09-25T00:00:00.000Z", projects: [project("project-a"), project("project-b")], workspace: { activeView: "create", currentProjectId: "project-a" } });
const identity = { requestId: "request-a", projectId: "project-a", canonicalDirectionId: selectedDirection.id, productContextFingerprint: fingerprint };

test("Stage 2 parses execution strategy and composes CreativeBriefV2 without replacing selected direction", async () => {
  const result = await api.generateCreativeBrief(input, async () => response({ ...expansion, hookLine: "model replacement", creativeAngle: "model replacement", openingVisual: { subject: "replacement" } }));
  assert.equal(result.status, "success");
  assert.equal(result.brief.schemaVersion, 2);
  assert.equal(result.brief.projectId, "project-a");
  assert.equal(result.brief.opportunity.targetAudience, selectedDirection.value.targetAudience);
  assert.equal(result.brief.opportunity.useMoment, selectedDirection.value.useMoment);
  assert.equal(result.brief.opportunity.purchaseMotivation, selectedDirection.value.coreMotivation);
  assert.equal(result.brief.direction.creativeAngle, selectedDirection.value.creativeAngle);
  assert.deepEqual(result.brief.direction.contentMechanisms, [selectedDirection.value.contentMechanism]);
  assert.equal(result.brief.opening.hookLine, selectedDirection.value.hookLine);
  assert.deepEqual(result.brief.opening.visual, selectedDirection.value.openingVisual);
  assert.equal(result.brief.productReference.contextFingerprint, fingerprint);
  assert.equal(result.brief.truth.primaryProductTruth, "privacy viewing");
});

test("invalid or unsupported expansion repairs at most once and never creates a fallback", async () => {
  let calls = 0;
  const repaired = await api.generateCreativeBrief(input, async () => {
    calls += 1;
    return calls === 1 ? response({ ...expansion, ctaDirection: "" }) : response(expansion);
  });
  assert.equal(repaired.status, "success");
  assert.equal(repaired.metadata.repairAttempted, true);
  assert.equal(calls, 2);

  calls = 0;
  const failed = await api.generateCreativeBrief(input, async () => { calls += 1; return response({ ...expansion, ctaDirection: "100% unbreakable" }); });
  assert.equal(failed.status, "failure");
  assert.equal(failed.brief, null);
  assert.equal(failed.metadata.fallbackUsed, false);
  assert.equal(calls, 2);
});

test("provider transport failure performs no repair and yields no Brief", async () => {
  let calls = 0;
  const result = await api.generateCreativeBrief(input, async () => { calls += 1; throw { category: "timeout" }; });
  assert.equal(result.status, "failure");
  assert.equal(result.brief, null);
  assert.equal(result.metadata.repairAttempted, false);
  assert.equal(calls, 1);
});

test("validated success persists one revision atomically with exactly one memory revision bump", () => {
  const brief = api.buildCreativeBrief(input, expansion, "2026-09-25T01:00:00.000Z");
  const saved = api.persistExpandedCreativeBrief(memory(), "writer", identity, identity, brief, "2026-09-25T01:00:00.000Z");
  assert.equal(saved.memoryRevision, 9);
  assert.equal(saved.projects[0].assets.creativeBriefRevisions.length, 1);
  assert.equal(saved.projects[0].assets.currentCreativeBriefRevisionId, brief.revisionId);
  assert.equal(saved.projects[1].assets.creativeBriefRevisions, undefined);
  const duplicate = api.persistExpandedCreativeBrief(saved, "writer", identity, identity, brief, "2026-09-25T02:00:00.000Z");
  assert.equal(duplicate, saved);
  assert.equal(duplicate.memoryRevision, 9);
});

test("stale request, foreign Project and Product Context changes cannot persist", () => {
  const brief = api.buildCreativeBrief(input, expansion);
  const original = memory();
  const stale = api.persistExpandedCreativeBrief(original, "writer", identity, { ...identity, requestId: "new-request" }, brief);
  const switched = api.persistExpandedCreativeBrief(original, "writer", identity, { ...identity, projectId: "project-b" }, brief);
  const changedProduct = api.persistExpandedCreativeBrief(original, "writer", identity, { ...identity, productContextFingerprint: "changed" }, brief);
  assert.equal(stale, original);
  assert.equal(switched, original);
  assert.equal(changedProduct, original);
  assert.equal(original.memoryRevision, 8);
});

test("product fingerprint mismatch and malformed expansion are rejected before persistence", () => {
  assert.throws(() => api.buildCreativeBrief({ ...input, productContextFingerprint: "wrong" }, expansion), /fingerprint mismatch/);
  assert.equal(api.parseCreativeBriefExpansion("not json"), null);
  assert.equal(api.parseCreativeBriefExpansion(JSON.stringify({ expansion: { ...expansion, evidenceStrategy: { ...expansion.evidenceStrategy, type: "made-up" } } })), null);
});

test("unsupported measured claims are rejected while ordinary execution timing remains usable", () => {
  assert.deepEqual(api.validateCreativeBriefExpansion({ ...expansion, evidenceStrategy: { ...expansion.evidenceStrategy, objective: "show a 99% improvement" } }, input), ["Unsupported numeric claim: 99%"]);
  assert.deepEqual(api.validateCreativeBriefExpansion({ ...expansion, evidenceStrategy: { ...expansion.evidenceStrategy, objective: "show the opening in the first 3 seconds" } }, input), []);
});

test("Brief API response parsing gives Stage 2 specific safe failures", async () => {
  await assert.rejects(() => api.parseCreativeBriefApiResponse(new Response("gateway", { status: 502, headers: { "content-type": "text/plain" } })), /创意简报生成失败/);
  await assert.rejects(() => api.parseCreativeBriefApiResponse(new Response(JSON.stringify({ status: "failure", error: { message: "创意简报生成失败，请重试" } }), { status: 422, headers: { "content-type": "application/json" } })), /创意简报生成失败/);
});
