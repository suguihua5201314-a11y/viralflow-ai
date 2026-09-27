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
  assert.deepEqual(api.parseCreativeBriefExpansion("not json"), { value: null, issues: [{ code: "invalid_json", stage: "json_parse", validator: "parseCreativeBriefExpansion" }] });
  assert.deepEqual(api.parseCreativeBriefExpansion(JSON.stringify({ expansion: { ...expansion, evidenceStrategy: { ...expansion.evidenceStrategy, type: "made-up" } } })).issues, [{ code: "invalid_enum", path: "evidenceStrategy.type", stage: "expansion_schema", validator: "parseCreativeBriefExpansion" }]);
});

test("unsupported measured claims are rejected while ordinary execution timing remains usable", () => {
  assert.deepEqual(api.validateCreativeBriefExpansion({ ...expansion, evidenceStrategy: { ...expansion.evidenceStrategy, objective: "show a 99% improvement" } }, input), [{ code: "unsupported_numeric_claim", path: "evidenceStrategy.objective", stage: "numeric", validator: "validateCreativeBriefExpansion" }]);
  assert.deepEqual(api.validateCreativeBriefExpansion({ ...expansion, evidenceStrategy: { ...expansion.evidenceStrategy, objective: "show the opening in the first 3 seconds" } }, input), []);
});

test("affirmative validation excludes safety metadata while preserving consumer-facing guards", () => {
  const safetyMetadata = {
    ...expansion,
    evidenceStrategy: { ...expansion.evidenceStrategy, limitations: ["Do not say 100% unbreakable"] },
    riskBoundaries: {
      prohibitedClaims: ["100% unbreakable"],
      requiredQualifiers: ["Do not promise a 99% result"],
      safetyConstraints: ["Do not claim guaranteed results"],
    },
  };
  assert.deepEqual(api.collectCreativeAssertionSurface(safetyMetadata).map(item => item.path), [
    "evidenceStrategy.objective",
    "evidenceStrategy.visualEvidence.0",
    "ctaDirection",
  ]);
  assert.deepEqual(api.validateCreativeBriefExpansion(safetyMetadata, input), []);

  const evidenceClaim = api.validateCreativeBriefExpansion({
    ...safetyMetadata,
    evidenceStrategy: { ...safetyMetadata.evidenceStrategy, objective: "Show 100% unbreakable protection" },
  }, input);
  assert.ok(evidenceClaim.some(item => item.code === "forbidden_claim" && item.path === "evidenceStrategy.objective"));
  assert.ok(evidenceClaim.some(item => item.code === "high_risk_compliance" && item.path === "evidenceStrategy.objective"));

  const ctaClaim = api.validateCreativeBriefExpansion({ ...safetyMetadata, ctaDirection: "Choose guaranteed 100% unbreakable protection" }, input);
  assert.ok(ctaClaim.some(item => item.code === "high_risk_compliance" && item.path === "ctaDirection"));

  const numericSafety = api.validateCreativeBriefExpansion({ ...safetyMetadata, riskBoundaries: { ...safetyMetadata.riskBoundaries, prohibitedClaims: ["Do not claim 99% effectiveness"] } }, input);
  assert.equal(numericSafety.some(item => item.code === "unsupported_numeric_claim"), false);
  const numericEvidence = api.validateCreativeBriefExpansion({ ...safetyMetadata, evidenceStrategy: { ...safetyMetadata.evidenceStrategy, objective: "Show 99% effectiveness" } }, input);
  assert.ok(numericEvidence.some(item => item.code === "unsupported_numeric_claim" && item.path === "evidenceStrategy.objective"));
});

test("safety metadata remains schema-bounded and duplicate-normalized", () => {
  const parsed = api.parseCreativeBriefExpansion(JSON.stringify({ expansion: {
    ...expansion,
    evidenceStrategy: { ...expansion.evidenceStrategy, limitations: ["avoid absolute claims", "avoid absolute claims"] },
    riskBoundaries: { ...expansion.riskBoundaries, prohibitedClaims: ["unbreakable", "unbreakable"] },
  } }));
  assert.deepEqual(parsed.issues, []);
  assert.deepEqual(parsed.value.evidenceStrategy.limitations, ["avoid absolute claims"]);
  assert.deepEqual(parsed.value.riskBoundaries.prohibitedClaims, ["unbreakable"]);
  const tooLong = api.parseCreativeBriefExpansion(JSON.stringify({ expansion: { ...expansion, riskBoundaries: { ...expansion.riskBoundaries, safetyConstraints: ["x".repeat(501)] } } }));
  assert.deepEqual(tooLong.issues, [{ code: "text_too_long", path: "riskBoundaries.safetyConstraints", stage: "expansion_schema", validator: "parseCreativeBriefExpansion" }]);
});

test("parser reports safe exact schema paths without generated values", () => {
  const missing = api.parseCreativeBriefExpansion(JSON.stringify({ expansion: { ...expansion, ctaDirection: undefined } }));
  assert.deepEqual(missing.issues, [{ code: "missing_field", path: "ctaDirection", stage: "expansion_schema", validator: "parseCreativeBriefExpansion" }]);
  const invalidOptional = api.parseCreativeBriefExpansion(JSON.stringify({ expansion: { ...expansion, creatorPersona: null } }));
  assert.deepEqual(invalidOptional.issues, [{ code: "invalid_type", path: "creatorPersona", stage: "expansion_schema", validator: "parseCreativeBriefExpansion" }]);
  assert.doesNotMatch(JSON.stringify([...missing.issues, ...invalidOptional.issues]), /commuter|null/);
});

test("truth and compliance failures expose safe codes without matched content", () => {
  const forbidden = api.validateCreativeBriefExpansion({ ...expansion, ctaDirection: "100% unbreakable" }, input);
  assert.ok(forbidden.some(item => item.code === "forbidden_claim" && item.stage === "truth"));
  assert.doesNotMatch(JSON.stringify(forbidden), /100% unbreakable/i);
});

test("repair receives safe structured issue codes and paths", async () => {
  const requests = [];
  const result = await api.generateCreativeBrief(input, async request => {
    requests.push(request);
    return requests.length === 1
      ? response({ ...expansion, evidenceStrategy: { ...expansion.evidenceStrategy, type: "generated-invalid-value" } })
      : response(expansion);
  });
  assert.equal(result.status, "success");
  const repair = JSON.parse(requests[1].messages[1].content);
  assert.deepEqual(repair.repairIssues, [{ code: "invalid_enum", path: "evidenceStrategy.type", stage: "expansion_schema", validator: "parseCreativeBriefExpansion" }]);
  assert.doesNotMatch(JSON.stringify(repair.repairIssues), /generated-invalid-value/);
});

test("validation issues are exposed only to Preview clients", () => {
  const issues = [{ code: "invalid_enum", path: "evidenceStrategy.type", stage: "expansion_schema", validator: "parseCreativeBriefExpansion" }];
  assert.deepEqual(api.validationIssuesForEnvironment(issues, "preview"), issues);
  assert.deepEqual(api.validationIssuesForEnvironment(issues, "production"), []);
  assert.deepEqual(api.validationIssuesForEnvironment(issues, undefined), []);
});

test("Brief API response parsing gives Stage 2 specific safe failures", async () => {
  await assert.rejects(() => api.parseCreativeBriefApiResponse(new Response("gateway", { status: 502, headers: { "content-type": "text/plain" } })), /创意简报生成失败/);
  await assert.rejects(() => api.parseCreativeBriefApiResponse(new Response(JSON.stringify({ status: "failure", error: { message: "创意简报生成失败，请重试" } }), { status: 422, headers: { "content-type": "application/json" } })), /创意简报生成失败/);
  await assert.rejects(
    () => api.parseCreativeBriefApiResponse(new Response(
      JSON.stringify({ status: "failure", brief: null, issues: [{ code: "invalid_enum", path: "evidenceStrategy.type", stage: "expansion_schema", validator: "parseCreativeBriefExpansion" }], error: { message: "创意简报生成失败，请重试" } }),
      { status: 422, headers: { "content-type": "application/json" } },
    )),
    error => error.validationIssue?.code === "invalid_enum" && error.validationIssue?.path === "evidenceStrategy.type",
  );
});
