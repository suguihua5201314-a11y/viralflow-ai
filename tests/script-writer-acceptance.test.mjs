import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const acceptance = await jiti.import("../app/script-writer-acceptance.ts");
const route = await jiti.import("../app/api/script-writer/route.ts");

const identity = (overrides = {}) => ({ requestId: "request-a", projectId: "project-a", creativeBriefId: "brief-a", creativeBriefRevisionId: "brief-revision-a", productContextFingerprint: "fingerprint-a", ...overrides });
const draft = { title: "A title", hook: { line: "A hook", openingVisualExecution: "Open on the product" }, scenes: [{ id: "scene-1", purpose: "hook", visual: "Phone", action: "Show it", dialogue: "Look", briefTrace: { executesOpeningVisual: true } }], fullNarration: "Narration", cta: "Check compatibility", language: "English" };
const script = { revisionId: "script-revision-a", title: "A title", product: "Product", language: "English", country: "Spain", style: "UGC", hook: "A hook", alternateHooks: [], narration: "Narration", scenes: [], creativeAngle: "Locked angle", sourceCreativeBriefId: "brief-a", sourceCreativeBriefRevisionId: "brief-revision-a" };
const metadata = { providerUsed: "deepseek", model: "safe-model", latencyMs: 1234, repairAttempted: false };
const brief = { direction: { creativeAngle: "Locked angle" }, opening: { hookLine: "Hook", visual: { subject: "Phone", action: "Reveal" } }, evidence: { type: "application", objective: "Show use" }, ctaDirection: "Check compatibility", riskBoundaries: { prohibitedClaims: [], requiredQualifiers: [], safetyConstraints: [] }, opportunityReference: { canonicalOpportunityId: "direction-a" } };

test("acceptance harness exposure is Preview-only", async () => {
  const previous = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "preview";
    assert.deepEqual(await (await route.GET()).json(), { acceptanceHarnessEnabled: true });
    process.env.VERCEL_ENV = "production";
    assert.deepEqual(await (await route.GET()).json(), { acceptanceHarnessEnabled: false });
  } finally { if (previous === undefined) delete process.env.VERCEL_ENV; else process.env.VERCEL_ENV = previous; }
  const component = await readFile(new URL("../app/components/script/creative-direction-workspace.tsx", import.meta.url), "utf8");
  assert.match(component, /writerAcceptanceEnabled &&/);
  assert.match(component, /测试 Brief Writer/);
});

test("Preview Writer routing inherits working Creative Brain override without changing Production", () => {
  assert.equal(route.resolveScriptWriterProvider("doubao", "preview", undefined, "deepseek"), "deepseek");
  assert.equal(route.resolveScriptWriterProvider("doubao", "preview", "openai", "deepseek"), "openai");
  assert.equal(route.resolveScriptWriterProvider("doubao", "production", "deepseek", "deepseek"), "doubao");
});

test("success and failure remain ephemeral and safely visible", async () => {
  const started = acceptance.beginScriptWriterAcceptance(identity());
  const success = acceptance.completeScriptWriterAcceptance(started, identity(), { script, draft, metadata });
  assert.equal(success.status, "success");
  assert.equal(success.draft.title, "A title");
  assert.equal(success.metadata.providerUsed, "deepseek");
  const failed = acceptance.failScriptWriterAcceptance(started, identity(), "failed", { stage: "draft_schema", code: "invalid_scene_purpose", path: "scenes[2].purpose" });
  assert.equal(failed.diagnostic, "draft_schema · invalid_scene_purpose · scenes[2].purpose");
  const component = await readFile(new URL("../app/components/script/creative-direction-workspace.tsx", import.meta.url), "utf8");
  assert.match(component, /Validation: \{writerAcceptance\.diagnostic\}/);
});

test("API response parser preserves safe validation issue and handles non-JSON failure", async () => {
  await assert.rejects(() => acceptance.parseScriptWriterAcceptanceResponse(new Response(JSON.stringify({ status: "failure", issues: [{ stage: "compliance", code: "high_risk_compliance", path: "scenes[1].dialogue", validator: "validate" }], error: { type: "validation_failed", message: "脚本草稿未通过结构或安全校验。" } }), { status: 422, headers: { "content-type": "application/json" } })), error => {
    assert.equal(error.validationIssue.path, "scenes[1].dialogue");
    assert.doesNotMatch(error.message, /provider|prompt|Product Context/);
    return true;
  });
  await assert.rejects(() => acceptance.parseScriptWriterAcceptanceResponse(new Response("gateway", { status: 504, headers: { "content-type": "text/plain" } })), /脚本生成超时/);
});

test("stale Project or Brief identity cannot overwrite current acceptance state", () => {
  const current = acceptance.beginScriptWriterAcceptance(identity({ requestId: "new" }));
  assert.equal(acceptance.completeScriptWriterAcceptance(current, identity({ requestId: "old" }), { script, draft, metadata }), current);
  assert.equal(acceptance.completeScriptWriterAcceptance(current, identity({ requestId: "new", projectId: "project-b" }), { script, draft, metadata }), current);
  assert.equal(acceptance.failScriptWriterAcceptance(current, identity({ requestId: "new", creativeBriefRevisionId: "brief-revision-b" }), "stale"), current);
});

test("page supplies the current Brief and canonical Product Context without persistence mutation", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const start = page.indexOf("async function testBriefWriter");
  const end = page.indexOf("function update(", start);
  const handler = page.slice(start, end);
  assert.match(handler, /resolveCanonicalProductContext/);
  assert.match(handler, /productContextFingerprint/);
  assert.match(handler, /creativeBriefReference:\{id:brief\.id,revisionId:brief\.revisionId\}/);
  assert.match(handler, /fetch\("\/api\/script-writer"/);
  assert.match(handler, /activeCreativeBriefRevision\.current!==brief\.revisionId/);
  assert.doesNotMatch(handler, /setProjectMemory|updateProjectMemory|scriptVersions:\[|selectedScriptRevisionId|memoryRevision/);
});

test("successful payload exposes validated Writer output only", async () => {
  const result = await acceptance.parseScriptWriterAcceptanceResponse(new Response(JSON.stringify({ status: "success", script, draft, metadata }), { status: 201, headers: { "content-type": "application/json" } }));
  assert.equal(result.script.sourceCreativeBriefRevisionId, "brief-revision-a");
  assert.equal(result.script.creativeAngle, "Locked angle");
  assert.equal(result.draft.scenes[0].briefTrace.executesOpeningVisual, true);
});
