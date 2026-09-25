import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const state = await jiti.import("../app/creative-direction-state.ts");

const opportunity = id => ({
  id, targetAudience: "commuters", useMoment: "on a train", purchaseMotivation: "privacy", tensionOrObjection: "side viewing", opportunity: `direction ${id}`, contentMechanisms: [`mechanism ${id}`], creativeAngle: `angle ${id}`,
  hookMechanism: `hook ${id}`, hookLine: `line ${id}`, openingVisual: { subject: "phone", setup: "train", action: `action ${id}` },
  evidenceStrategy: { type: "routine-context", objective: `evidence ${id}`, visualEvidence: ["seat change"], limitations: [] }, creatorPersona: "commuter", contentFormat: "diary", ctaDirection: "check compatibility", riskNotes: [],
});

test("response candidates canonicalize once and rerender-style reads retain IDs", () => {
  let sessions = state.beginCreativeDirectionRequest({}, "project-a", "request-1");
  sessions = state.completeCreativeDirectionRequest(sessions, "project-a", "request-1", { status: "success", opportunities: [opportunity("A"), opportunity("B"), opportunity("C")] });
  const firstIds = sessions["project-a"].opportunities.map(item => item.id);
  const sameRenderState = sessions["project-a"];
  assert.deepEqual(sameRenderState.opportunities.map(item => item.id), firstIds);
  assert.ok(firstIds.every(id => id.startsWith("creative-opportunity-")));
  assert.equal(new Set(firstIds).size, 3);
});

test("Project-scoped completion cannot place A directions in B", () => {
  let sessions = state.beginCreativeDirectionRequest({}, "project-a", "request-a");
  sessions = state.beginCreativeDirectionRequest(sessions, "project-b", "request-b");
  const completed = state.completeCreativeDirectionRequest(sessions, "project-a", "request-a", { status: "success", opportunities: [opportunity("A"), opportunity("B"), opportunity("C")] });
  assert.equal(completed["project-a"].opportunities.length, 3);
  assert.equal(completed["project-b"].opportunities.length, 0);
  assert.equal(completed["project-b"].status, "loading");
});

test("stale same-Project request cannot replace the latest generation", () => {
  let sessions = state.beginCreativeDirectionRequest({}, "project-a", "old");
  sessions = state.beginCreativeDirectionRequest(sessions, "project-a", "new");
  const stale = state.completeCreativeDirectionRequest(sessions, "project-a", "old", { status: "success", opportunities: [opportunity("OLD")] });
  assert.equal(stale, sessions);
  const current = state.completeCreativeDirectionRequest(stale, "project-a", "new", { status: "success", opportunities: [opportunity("A"), opportunity("B"), opportunity("C")] });
  assert.deepEqual(current["project-a"].opportunities.map(item => item.sourceCandidateId), ["A", "B", "C"]);
});

test("regenerate replaces ephemeral wrappers while selection identity remains reusable", () => {
  let sessions = state.beginCreativeDirectionRequest({}, "project-a", "first");
  sessions = state.completeCreativeDirectionRequest(sessions, "project-a", "first", { status: "success", opportunities: [opportunity("A"), opportunity("B"), opportunity("C")] });
  const selected = sessions["project-a"].opportunities[1];
  sessions = state.markCreativeDirectionSelection(sessions, "project-a", selected.id, true);
  sessions = state.beginCreativeDirectionRequest(sessions, "project-a", "second");
  sessions = state.completeCreativeDirectionRequest(sessions, "project-a", "second", { status: "success", opportunities: [opportunity("D"), opportunity("E"), opportunity("F")] });
  assert.deepEqual(sessions["project-a"].opportunities.map(item => item.sourceCandidateId), ["D", "E", "F"]);
  assert.equal(sessions["project-a"].selectedOpportunityId, selected.id);
});

test("partial results remain visible and failures do not invent candidates", () => {
  let partial = state.beginCreativeDirectionRequest({}, "project-a", "partial");
  partial = state.completeCreativeDirectionRequest(partial, "project-a", "partial", { status: "partial", opportunities: [opportunity("A")] });
  assert.equal(partial["project-a"].status, "partial");
  assert.equal(partial["project-a"].opportunities.length, 1);
  let failed = state.beginCreativeDirectionRequest({}, "project-b", "failed");
  failed = state.failCreativeDirectionRequest(failed, "project-b", "failed", "provider unavailable");
  assert.equal(failed["project-b"].status, "error");
  assert.deepEqual(failed["project-b"].opportunities, []);
});

test("UI wiring uses canonical Product Context, Creative Brain API and 2A selection without Script or Director generation", async () => {
  const [page, studio, component] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/script/creative-direction-workspace.tsx", import.meta.url), "utf8"),
  ]);
  const generationPath = page.slice(page.indexOf("async function generateCreativeDirections"), page.indexOf("function selectCreativeDirection"));
  const selectionPath = page.slice(page.indexOf("function selectCreativeDirection"), page.indexOf("function update("));
  assert.match(generationPath, /resolveCanonicalProductContext/);
  assert.match(generationPath, /fetch\("\/api\/creative-brain"/);
  assert.doesNotMatch(generationPath, /\/api\/scripts|generate\(|Director|Image/);
  assert.match(selectionPath, /selectCreativeOpportunity/);
  assert.match(selectionPath, /capturedInput\.input\.productContext/);
  assert.match(selectionPath, /preferences:capturedInput\.input\.preferences/);
  assert.doesNotMatch(selectionPath, /createCreativeBrief|appendCreativeBriefRevision|scriptVersions:\s*\[/);
  assert.match(studio, /CreativeDirectionWorkspace/);
  assert.match(component, /生成创意方向/);
  assert.match(component, /当前创意方向/);
  assert.match(component, /Creative Brief 已创建/);
});
