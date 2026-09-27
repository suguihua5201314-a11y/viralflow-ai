import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const acceptance = await jiti.import("../app/script-critic-acceptance.ts");
const route = await jiti.import("../app/api/script-critic/route.ts");

const identity = (overrides = {}) => ({ requestId: "critic-request-a", projectId: "project-a", creativeBriefId: "brief-a", creativeBriefRevisionId: "brief-revision-a", productContextFingerprint: "fingerprint-a", writerRequestId: "writer-request-a", ...overrides });
const issue = { code: "opening_visual_mismatch", severity: "major", target: { scope: "hook", field: "openingVisualExecution" }, message: "The visible opening does not execute the locked opening concept.", rewriteInstruction: "Correct only the opening execution.", deterministic: false, briefField: "opening.visual" };
const critique = { verdict: "needs_rewrite", issues: [issue], summary: "One localized fidelity issue." };
const metadata = { providerUsed: "deepseek", model: "safe-model", latencyMs: 1234, repairAttempted: false };

test("Critic acceptance harness is exposed only in Preview", async () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "preview";
    assert.deepEqual(await (await route.GET()).json(), { acceptanceHarnessEnabled: true });
    process.env.VERCEL_ENV = "production";
    assert.deepEqual(await (await route.GET()).json(), { acceptanceHarnessEnabled: false });
  } finally { if (previous === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = previous; }
  const component = await readFile(new URL("../app/components/script/creative-direction-workspace.tsx", import.meta.url), "utf8");
  assert.match(component, /criticAcceptanceEnabled && writerAcceptance\.status === "success"/);
  assert.match(component, /测试 Script Critic/);
});

test("Preview Critic routing inherits Creative Brain override while Production remains unchanged", () => {
  assert.equal(route.resolveScriptCriticProvider("doubao", "preview", undefined, "deepseek"), "deepseek");
  assert.equal(route.resolveScriptCriticProvider("doubao", "preview", "openai", "deepseek"), "openai");
  assert.equal(route.resolveScriptCriticProvider("doubao", "production", "deepseek", "deepseek"), "doubao");
});

test("success and failure states are ephemeral and retain safe structured diagnostics", () => {
  const started = acceptance.beginScriptCriticAcceptance(identity());
  const success = acceptance.completeScriptCriticAcceptance(started, identity(), { critique, metadata });
  assert.equal(success.status, "success");
  assert.equal(success.critique.issues[0].code, "opening_visual_mismatch");
  const failed = acceptance.failScriptCriticAcceptance(started, identity(), "failed", { stage: "critic_target", code: "unknown_scene", path: "issues.0.target.sceneId", validator: "parseScriptCriticResult" });
  assert.equal(failed.diagnostic, "critic_target · unknown_scene · issues.0.target.sceneId");
});

test("API parser accepts validated result and preserves a safe failure issue", async () => {
  const success = await acceptance.parseScriptCriticAcceptanceResponse(new Response(JSON.stringify({ status: "success", critique, metadata }), { status: 200, headers: { "content-type": "application/json" } }));
  assert.equal(success.critique.verdict, "needs_rewrite");
  await assert.rejects(() => acceptance.parseScriptCriticAcceptanceResponse(new Response(JSON.stringify({ status: "failure", validationIssues: [{ stage: "critic_schema", code: "invalid_issue_code", path: "issues.0.code", validator: "parseScriptCriticResult" }], error: { type: "repair_failed", message: "脚本评审结果未通过结构校验。" } }), { status: 422, headers: { "content-type": "application/json" } })), error => {
    assert.equal(error.validationIssue.path, "issues.0.code");
    assert.doesNotMatch(error.message, /prompt|Product Context|provider response/);
    return true;
  });
});

test("stale Project, Brief, Writer, and request identities cannot overwrite current Critic state", () => {
  const current = acceptance.beginScriptCriticAcceptance(identity());
  for (const stale of [
    identity({ requestId: "old" }), identity({ projectId: "project-b" }), identity({ creativeBriefRevisionId: "brief-revision-b" }), identity({ writerRequestId: "writer-request-b" }),
  ]) assert.equal(acceptance.completeScriptCriticAcceptance(current, stale, { critique, metadata }), current);
  assert.equal(acceptance.failScriptCriticAcceptance(current, identity({ productContextFingerprint: "other" }), "stale"), current);
});

test("page hands the actual successful Writer draft and current canonical identities to Critic", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const start = page.indexOf("async function testScriptCritic");
  const end = page.indexOf("function update(", start);
  const handler = page.slice(start, end);
  assert.match(handler, /writerAcceptance\.status!=="success"/);
  assert.match(handler, /const writerDraft=writerAcceptance\.draft/);
  assert.match(handler, /scriptDraft:writerDraft/);
  assert.match(handler, /creativeBriefReference:\{briefId:brief\.id,briefRevisionId:brief\.revisionId\}/);
  assert.match(handler, /canonicalProductContext:productContext/);
  assert.match(handler, /productContextFingerprint:fingerprint/);
  assert.match(handler, /writerRequestId:writerIdentity\.requestId/);
  assert.match(handler, /activeWriterAcceptance\.current\?\.requestId!==identity\.writerRequestId/);
});

test("Critic acceptance does not persist, rewrite, mutate Script versions, or enter Director", async () => {
  const [page, acceptanceSource] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/script-critic-acceptance.ts", import.meta.url), "utf8"),
  ]);
  const start = page.indexOf("async function testScriptCritic");
  const end = page.indexOf("function update(", start);
  const handler = page.slice(start, end);
  assert.doesNotMatch(handler, /setProjectMemory|updateProjectMemory|mutateMemory|scriptVersions|selectedScriptRevisionId|memoryRevision|targeted|rewrite|director/i);
  assert.doesNotMatch(acceptanceSource, /localStorage|project-memory|scriptVersions|selectedScriptRevisionId/);
});

test("Critic result UI renders bounded structured issues and safe metadata", async () => {
  const component = await readFile(new URL("../app/components/script/creative-direction-workspace.tsx", import.meta.url), "utf8");
  for (const token of ["Critic Result", "NEEDS REWRITE", "issue.severity", "issue.code", "issue.target.scope", "issue.message", "issue.rewriteInstruction", "issue.briefField", "providerUsed", "model", "latencyMs", "repairAttempted"]) assert.match(component, new RegExp(token.replace(".", "\\.")));
  assert.match(component, /Validation: \{criticAcceptance\.diagnostic\}/);
  assert.doesNotMatch(component, /raw provider response|Product Context raw|API key|Authorization/);
});
