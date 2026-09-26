import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const state = await jiti.import("../app/creative-direction-state.ts");
const brain = await jiti.import("../app/creative-brain.ts");

const direction = id => ({
  id, targetAudience: "commuters", useMoment: "on a train", coreMotivation: "privacy", coreTension: "side viewing",
  creativeAngle: `angle ${id}`, contentMechanism: `mechanism ${id}`, hookLine: `line ${id}`,
  openingVisual: { subject: "phone", setup: "train", action: `action ${id}` }, rationale: `reason ${id}`,
});

test("response candidates canonicalize once and rerender-style reads retain IDs", () => {
  let sessions = state.beginCreativeDirectionRequest({}, "project-a", "request-1");
  sessions = state.completeCreativeDirectionRequest(sessions, "project-a", "request-1", { status: "success", directions: [direction("A"), direction("B"), direction("C")] });
  const firstIds = sessions["project-a"].directions.map(item => item.id);
  const sameRenderState = sessions["project-a"];
  assert.deepEqual(sameRenderState.directions.map(item => item.id), firstIds);
  assert.ok(firstIds.every(id => id.startsWith("creative-opportunity-")));
  assert.equal(new Set(firstIds).size, 3);
});

test("Project-scoped completion cannot place A directions in B", () => {
  let sessions = state.beginCreativeDirectionRequest({}, "project-a", "request-a");
  sessions = state.beginCreativeDirectionRequest(sessions, "project-b", "request-b");
  const completed = state.completeCreativeDirectionRequest(sessions, "project-a", "request-a", { status: "success", directions: [direction("A"), direction("B"), direction("C")] });
  assert.equal(completed["project-a"].directions.length, 3);
  assert.equal(completed["project-b"].directions.length, 0);
  assert.equal(completed["project-b"].status, "loading");
});

test("stale same-Project request cannot replace the latest generation", () => {
  let sessions = state.beginCreativeDirectionRequest({}, "project-a", "old");
  sessions = state.beginCreativeDirectionRequest(sessions, "project-a", "new");
  const stale = state.completeCreativeDirectionRequest(sessions, "project-a", "old", { status: "success", directions: [direction("OLD")] });
  assert.equal(stale, sessions);
  const current = state.completeCreativeDirectionRequest(stale, "project-a", "new", { status: "success", directions: [direction("A"), direction("B"), direction("C")] });
  assert.deepEqual(current["project-a"].directions.map(item => item.sourceCandidateId), ["A", "B", "C"]);
});

test("regenerate replaces ephemeral wrappers while selection identity remains reusable", () => {
  let sessions = state.beginCreativeDirectionRequest({}, "project-a", "first");
  sessions = state.completeCreativeDirectionRequest(sessions, "project-a", "first", { status: "success", directions: [direction("A"), direction("B"), direction("C")] });
  const selected = sessions["project-a"].directions[1];
  sessions = state.markCreativeDirectionSelection(sessions, "project-a", selected.id, true);
  sessions = state.beginCreativeDirectionRequest(sessions, "project-a", "second");
  sessions = state.completeCreativeDirectionRequest(sessions, "project-a", "second", { status: "success", directions: [direction("D"), direction("E"), direction("F")] });
  assert.deepEqual(sessions["project-a"].directions.map(item => item.sourceCandidateId), ["D", "E", "F"]);
  assert.equal(sessions["project-a"].selectedOpportunityId, selected.id);
});

test("partial results remain visible and failures do not invent candidates", () => {
  let partial = state.beginCreativeDirectionRequest({}, "project-a", "partial");
  partial = state.completeCreativeDirectionRequest(partial, "project-a", "partial", { status: "partial", directions: [direction("A")] });
  assert.equal(partial["project-a"].status, "partial");
  assert.equal(partial["project-a"].directions.length, 1);
  let failed = state.beginCreativeDirectionRequest({}, "project-b", "failed");
  failed = state.failCreativeDirectionRequest(failed, "project-b", "failed", "provider unavailable");
  assert.equal(failed["project-b"].status, "error");
  assert.deepEqual(failed["project-b"].directions, []);
});

test("UI wiring uses canonical Product Context, Creative Brain API and 2A selection without Script or Director generation", async () => {
  const [page, studio, component] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/script-studio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/script/creative-direction-workspace.tsx", import.meta.url), "utf8"),
  ]);
  const generationPath = page.slice(page.indexOf("async function generateCreativeDirections"), page.indexOf("function update("));
  assert.match(generationPath, /resolveCanonicalProductContext/);
  assert.match(generationPath, /fetch\("\/api\/creative-brain"/);
  assert.match(generationPath, /parseCreativeDirectionApiResponse/);
  assert.doesNotMatch(generationPath, /\/api\/scripts|generate\(|Director|Image/);
  assert.doesNotMatch(generationPath, /selectCreativeOpportunity|createCreativeBrief|appendCreativeBriefRevision/);
  assert.match(studio, /CreativeDirectionWorkspace/);
  assert.match(component, /生成创意方向/);
  assert.match(component, /创意简报已准备/);
  assert.match(component, /使用这个方向/);
  assert.match(component, /正在生成完整创意简报/);
  assert.match(component, /创意简报已准备/);
  assert.match(page, /fetch\("\/api\/creative-brief"/);
});

test("Brief request state preserves canonical direction identity across retry and rejects stale completion", () => {
  let sessions = state.beginCreativeDirectionRequest({}, "project-a", "directions");
  sessions = state.completeCreativeDirectionRequest(sessions, "project-a", "directions", { status: "success", directions: [direction("A"), direction("B"), direction("C")] });
  const canonicalId = sessions["project-a"].directions[0].id;
  sessions = state.beginCreativeBriefRequest(sessions, "project-a", canonicalId, "brief-1");
  const stale = state.completeCreativeBriefRequest(sessions, "project-a", canonicalId, "old-request");
  assert.equal(stale, sessions);
  sessions = state.failCreativeBriefRequest(sessions, "project-a", canonicalId, "brief-1", "failed");
  assert.equal(sessions["project-a"].selectedOpportunityId, canonicalId);
  sessions = state.beginCreativeBriefRequest(sessions, "project-a", canonicalId, "brief-2");
  assert.equal(sessions["project-a"].selectedOpportunityId, canonicalId);
  sessions = state.completeCreativeBriefRequest(sessions, "project-a", canonicalId, "brief-2");
  assert.equal(sessions["project-a"].briefStatus, "ready");
  assert.equal(sessions["project-a"].selectedOpportunityId, canonicalId);
});

test("frontend safely normalizes platform text, HTML and invalid JSON responses", async () => {
  for (const response of [
    new Response("An error occurred", { status: 504, headers: { "content-type": "text/plain" } }),
    new Response("<html>Gateway timeout</html>", { status: 504, headers: { "content-type": "text/html" } }),
    new Response("not-json", { status: 504, headers: { "content-type": "application/json" } }),
  ]) {
    await assert.rejects(() => brain.parseCreativeBrainApiResponse(response), error => {
      assert.equal(error.message, "创意方向生成超时，请重试。");
      assert.doesNotMatch(error.message, /Unexpected token|An error occurred|<html>/);
      return true;
    });
  }
});

test("frontend keeps normal success and partial JSON responses unchanged", async () => {
  for (const status of ["success", "partial"]) {
    const result = { status, directions: [direction("A")], metadata: { errorType: null }, validationSummary: { issues: [], diversityPassed: true } };
    const directions = await jiti.import("../app/creative-directions.ts");
    const parsed = await directions.parseCreativeDirectionApiResponse(new Response(JSON.stringify(result), { status: status === "success" ? 201 : 206, headers: { "content-type": "application/json" } }));
    assert.deepEqual(parsed, result);
  }
});
