import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";
import { makeInput, response } from "./targeted-script-rewrite-fixtures.mjs";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const runtime = await jiti.import("../app/brief-driven-script-rewriter.ts");
const critic = await jiti.import("../app/brief-driven-script-critic.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");
const director = await jiti.import("../app/director-core.ts");
const api = { ...runtime, ...critic };

test("one atomic Provider call creates Revision B and preserves Brief lineage", async () => {
  const input = makeInput(api, selection);
  const before = structuredClone(input);
  let calls = 0;
  const result = await runtime.generateTargetedScriptRewrite(input, async () => { calls += 1; return response({ replacements: [{ patchId: "patch-1", replacementValue: "先看这个操作会发生什么。" }] }); });
  assert.equal(result.status, "success");
  assert.equal(calls, 1);
  assert.equal(result.metadata.providerCalls, 1);
  assert.notEqual(result.metadata.scriptRevisionId, input.sourceScriptRevisionId);
  assert.match(result.script.revisionId, /^script-revision-/);
  assert.equal(result.script.sourceCreativeBriefId, input.creativeBrief.id);
  assert.equal(result.script.sourceCreativeBriefRevisionId, input.creativeBrief.revisionId);
  assert.equal(result.metadata.projectId, input.projectId);
  assert.equal(result.metadata.productContextFingerprint, input.productContextFingerprint);
  assert.equal(result.metadata.sourceCreativeBriefId, input.creativeBrief.id);
  assert.equal(result.metadata.sourceCreativeBriefRevisionId, input.creativeBrief.revisionId);
  assert.equal(result.draft.workspaceLanguage, "zh-CN");
  assert.equal(result.draft.targetLanguage, "Spanish");
  assert.equal(result.draft.localizationStatus, "source");
  assert.deepEqual(input, before);
});

test("multiple targets use exactly one Provider call and apply atomically", async () => {
  const input = makeInput(api, selection);
  const targetRef = "CTA";
  const resolvedTarget = critic.resolveCriticTargetRef(input.currentDraft, targetRef);
  input.issues.push({ ...input.issues[0], patchId: "patch-2", targetRef, resolvedTarget, expectedCurrentValue: critic.resolveCriticTarget(input.currentDraft, resolvedTarget).value, issueCode: "cta_too_hard", rewriteInstruction: "让行动引导更自然。", briefField: "ctaDirection" });
  let calls = 0;
  const result = await runtime.generateTargetedScriptRewrite(input, async () => { calls += 1; return response({ replacements: [{ patchId: "patch-1", replacementValue: "先看这个步骤。" }, { patchId: "patch-2", replacementValue: "可以先确认适配型号。" }] }); });
  assert.equal(calls, 1);
  assert.equal(result.status, "success");
  assert.equal(result.draft.hook.line, "先看这个步骤。");
  assert.equal(result.draft.cta, "可以先确认适配型号。");
});

test("conflict and stale source fail before Provider and no second rewrite occurs", async () => {
  for (const input of [
    (() => { const value = makeInput(api, selection); value.issues.push({ ...value.issues[0], patchId: "patch-2", rewriteInstruction: "改变策略。" }); return value; })(),
    (() => { const value = makeInput(api, selection); value.issues[0].sourceScriptRevisionId = "script-revision-old"; return value; })(),
  ]) {
    let calls = 0;
    const result = await runtime.generateTargetedScriptRewrite(input, async () => { calls += 1; return response({ replacements: [] }); });
    assert.equal(result.status, "failure");
    assert.equal(calls, 0);
  }
});

test("different Brief revision and stale Critic issues from Revision A cannot mutate Revision B", async () => {
  const wrongBrief = makeInput(api, selection);
  wrongBrief.creativeBriefReference.revisionId = "brief-revision-b";
  let calls = 0;
  const rejectedBrief = await runtime.generateTargetedScriptRewrite(wrongBrief, async () => { calls += 1; return response({ replacements: [] }); });
  assert.equal(rejectedBrief.status, "failure");
  assert.equal(calls, 0);

  const staleCritic = makeInput(api, selection, { sourceScriptRevisionId: "script-revision-b" });
  staleCritic.issues[0].sourceScriptRevisionId = "script-revision-a";
  const rejectedStale = await runtime.generateTargetedScriptRewrite(staleCritic, async () => { calls += 1; return response({ replacements: [] }); });
  assert.equal(rejectedStale.status, "failure");
  assert.equal(calls, 0);
});

test("invalid Provider output performs no partial patch and maximum calls remains one", async () => {
  const input = makeInput(api, selection);
  const before = structuredClone(input.currentDraft);
  let calls = 0;
  const result = await runtime.generateTargetedScriptRewrite(input, async () => { calls += 1; return response({ replacements: [{ patchId: "wrong", replacementValue: "内容" }] }); });
  assert.equal(result.status, "failure");
  assert.equal(calls, 1);
  assert.equal(result.draft, null);
  assert.deepEqual(input.currentDraft, before);
});

test("new revision naturally invalidates the old Director context", async () => {
  const input = makeInput(api, selection);
  const result = await runtime.generateTargetedScriptRewrite(input, async () => response({ replacements: [{ patchId: "patch-1", replacementValue: "先观察这个操作。" }] }));
  const context = { product: "CrystalArmor", sellingPoints: "对位安装器辅助安装", audience: "通勤用户", market: "Spain", language: "zh-CN", platform: "TikTok", targetDuration: 15, creativeMode: "UGC", hookStrategy: "视觉问题", framework: "Creative Brief", creativeAngle: input.creativeBrief.direction.creativeAngle, sourceType: "script-studio" };
  const oldId = director.directorContextId({ projectId: input.projectId, scriptRevisionId: input.sourceScriptRevisionId, script: result.script, context });
  const newId = director.directorContextId({ projectId: input.projectId, scriptRevisionId: result.script.revisionId, script: result.script, context });
  assert.notEqual(oldId, newId);
});
