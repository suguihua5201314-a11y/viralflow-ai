import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const selection = await jiti.import("../app/creative-opportunity-selection.ts");
const productApi = await jiti.import("../app/product-context.ts");
const memoryApi = await jiti.import("../app/project-memory.ts");
const foundation = await jiti.import("../app/script-foundation.ts");

const profile = { id: 7, name: "CrystalArmor", brand: "CrystalArmor", category: "Accessory", sellingPoints: "alignment applicator; privacy viewing", parameters: "oleophobic surface", bannedWords: "100% unbreakable", markets: "Spain", audience: "phone users", price: "", offer: "", notes: "Avoid destructive tests" };
const productContext = productApi.resolveCanonicalProductContext({ productName: profile.name, selectedProductId: profile.id, profiles: [profile] });
const candidate = (id, angle = "commute privacy") => ({
  id, targetAudience: "commuters", useMoment: "on a train", purchaseMotivation: "reduce casual side viewing", tensionOrObjection: "public visibility", opportunity: "make viewing angle tangible", contentMechanisms: ["point-of-view switch"], creativeAngle: angle,
  hookMechanism: "visual question", hookLine: "What changes from the next seat?", openingVisual: { subject: "phone", setup: "train seat", action: "rotate from front to side", visibleChangeOrQuestion: "viewing angle changes" },
  evidenceStrategy: { type: "routine-context", objective: "show ordinary side viewing", visualEvidence: ["camera changes seat"], limitations: ["do not imply total privacy"] }, creatorPersona: "commuter", contentFormat: "observational diary", ctaDirection: "check model compatibility", riskNotes: ["avoid absolute privacy claims"],
});
const project = id => ({ id, name: id, product: profile.name, productProfileId: profile.id, market: "Spain", platform: "TikTok", language: "Spanish", stage: "脚本", createdAt: "2026-09-25T00:00:00.000Z", updatedAt: "2026-09-25T00:00:00.000Z", assets: { scriptVersions: [] } });
const memory = () => ({ version: 1, memoryRevision: 4, writerId: "writer-old", updatedAt: "2026-09-25T00:00:00.000Z", projects: [project("project-a"), project("project-b")], workspace: { activeView: "create", currentProjectId: "project-a" } });
const input = (projectId, opportunity) => ({ projectId, opportunity, productContext, market: "Spain", language: "Spanish", platform: "TikTok", preferences: { creationMode: "original", hookStrategy: "curiosity", framework: "AIDA", creativity: "high" }, recentScriptRevisionIds: ["script-old"], now: "2026-09-25T01:00:00.000Z" });

test("canonical Opportunity identity replaces the model candidate ID and is collision-safe", () => {
  const first = selection.canonicalizeCreativeOpportunity(candidate("model-A"));
  const second = selection.canonicalizeCreativeOpportunity(candidate("model-A"));
  assert.match(first.id, /^creative-opportunity-/);
  assert.equal(first.sourceCandidateId, "model-A");
  assert.notEqual(first.id, "model-A");
  assert.notEqual(first.id, second.id);
  assert.equal("id" in first.value, false);
});

test("validated Opportunity maps completely into CreativeBriefV2 and binds canonical product context", () => {
  const canonical = selection.canonicalizeCreativeOpportunity(candidate("model-A"), "creative-opportunity-fixed");
  const brief = selection.createBriefFromSelectedOpportunity(input("project-a", canonical));
  assert.match(brief.id, /^creative-brief-/);
  assert.match(brief.revisionId, /^creative-brief-revision-/);
  assert.deepEqual(brief.opportunityReference, { canonicalOpportunityId: canonical.id, sourceCandidateId: "model-A" });
  assert.equal(brief.productReference.productProfileId, profile.id);
  assert.equal(brief.productReference.productName, profile.name);
  assert.match(brief.productReference.contextFingerprint, /^product-context-/);
  assert.equal(brief.opportunity.creativeOpportunity, canonical.value.opportunity);
  assert.equal(brief.opening.visual.action, canonical.value.openingVisual.action);
  assert.equal(brief.evidence.type, canonical.value.evidenceStrategy.type);
  assert.equal(brief.ctaDirection, canonical.value.ctaDirection);
  assert.deepEqual(brief.preferences, input("project-a", canonical).preferences);
});

test("selection atomically appends history, selects current revision and bumps memory exactly once", () => {
  const canonicalA = selection.canonicalizeCreativeOpportunity(candidate("A"), "creative-opportunity-a");
  const first = selection.selectCreativeOpportunity(memory(), "writer-home", input("project-a", canonicalA));
  assert.equal(first.status, "created");
  assert.equal(first.memory.memoryRevision, 5);
  const savedA = first.memory.projects[0].assets.creativeBriefRevisions;
  assert.equal(savedA.length, 1);
  assert.equal(first.memory.projects[0].assets.currentCreativeBriefRevisionId, first.brief.revisionId);

  const duplicate = selection.selectCreativeOpportunity(first.memory, "writer-home", input("project-a", canonicalA));
  assert.equal(duplicate.status, "existing");
  assert.equal(duplicate.memory, first.memory);
  assert.equal(duplicate.memory.memoryRevision, 5);

  const canonicalB = selection.canonicalizeCreativeOpportunity(candidate("B", "desk installation"), "creative-opportunity-b");
  const second = selection.selectCreativeOpportunity(first.memory, "writer-home", input("project-a", canonicalB));
  assert.equal(second.memory.memoryRevision, 6);
  assert.equal(second.memory.projects[0].assets.creativeBriefRevisions.length, 2);
  assert.notEqual(second.brief.id, first.brief.id);
  assert.equal(second.memory.projects[0].assets.currentCreativeBriefRevisionId, second.brief.revisionId);
});

test("Project ownership isolates Brief selection and rejects a missing captured Project", () => {
  const opportunityA = selection.canonicalizeCreativeOpportunity(candidate("A"), "creative-opportunity-a");
  const savedA = selection.selectCreativeOpportunity(memory(), "writer-home", input("project-a", opportunityA));
  const opportunityB = selection.canonicalizeCreativeOpportunity(candidate("B", "installation"), "creative-opportunity-b");
  const savedB = selection.selectCreativeOpportunity(savedA.memory, "writer-home", input("project-b", opportunityB));
  const [projectA, projectB] = savedB.memory.projects;
  assert.deepEqual(projectA.assets.creativeBriefRevisions.map(item => item.opportunityReference.canonicalOpportunityId), [opportunityA.id]);
  assert.deepEqual(projectB.assets.creativeBriefRevisions.map(item => item.opportunityReference.canonicalOpportunityId), [opportunityB.id]);
  const missing = selection.selectCreativeOpportunity(savedB.memory, "writer-home", input("project-deleted", opportunityA));
  assert.equal(missing.status, "project-not-found");
  assert.equal(missing.memory, savedB.memory);
});

test("serialize, normalize and hydrate preserve Brief and Opportunity identities without revision mutation", () => {
  const canonical = selection.canonicalizeCreativeOpportunity(candidate("A"), "creative-opportunity-a");
  const saved = selection.selectCreativeOpportunity(memory(), "writer-home", input("project-a", canonical));
  const serialized = JSON.parse(JSON.stringify(saved.memory));
  const restored = memoryApi.normalizeProjectMemory(serialized);
  const brief = restored.projects[0].assets.creativeBriefRevisions[0];
  assert.equal(restored.memoryRevision, saved.memory.memoryRevision);
  assert.equal(brief.id, saved.brief.id);
  assert.equal(brief.revisionId, saved.brief.revisionId);
  assert.equal(brief.opportunityReference.canonicalOpportunityId, canonical.id);
  assert.equal(restored.projects[0].assets.currentCreativeBriefRevisionId, saved.brief.revisionId);
});

test("real selected Brief reference is directly consumable by Script lineage", () => {
  const canonical = selection.canonicalizeCreativeOpportunity(candidate("A"), "creative-opportunity-a");
  const saved = selection.selectCreativeOpportunity(memory(), "writer-home", input("project-a", canonical));
  const script = foundation.bindScriptToCreativeBrief({ revisionId: "script-r1", title: "Draft" }, saved.brief);
  assert.equal(script.sourceCreativeBriefId, saved.brief.id);
  assert.equal(script.sourceCreativeBriefRevisionId, saved.brief.revisionId);
});

test("optional Analyzer, Replication and Reference Script sources fit the same Brief contract", () => {
  const canonical = selection.canonicalizeCreativeOpportunity(candidate("A"), "creative-opportunity-a");
  for (const [kind, field] of [["analyzer", "analyzerSourceId"], ["replication", "replicationSourceId"], ["reference-script", "referenceScriptSourceId"]]) {
    const brief = selection.createBriefFromSelectedOpportunity({ ...input("project-a", canonical), sourceContext: { kind, sourceId: `${kind}-source` } });
    assert.equal(brief.sources[field], `${kind}-source`);
  }
});

test("foundation has no generation, UI, API, Director or pre-selection persistence side effects", async () => {
  const source = await readFile(new URL("../app/creative-opportunity-selection.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /generateCreativeOpportunities|fetch\(|\/api\/scripts|Director|localStorage|React/);
  assert.match(source, /mutateProjectMemory/);
});
