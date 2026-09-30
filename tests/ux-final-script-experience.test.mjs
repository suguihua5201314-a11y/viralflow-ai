import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";
import { context, brief, draft } from "./targeted-script-rewrite-fixtures.mjs";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const orchestration = await jiti.import("../app/final-script-orchestration.ts");
const foundation = await jiti.import("../app/brief-driven-script.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");

function setup() {
  const productContext = context();
  const fingerprint = selection.productContextFingerprint(productContext);
  const creativeBrief = brief(fingerprint);
  const languageContext = { workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok" };
  const writerInput = { projectId: "project-a", requestId: "final-a", creativeBriefReference: { id: creativeBrief.id, revisionId: creativeBrief.revisionId }, creativeBrief, productContext, productContextFingerprint: fingerprint, platform: "TikTok", market: "Spain", languageContext, preferences: { variantCount: 1 } };
  const criticInput = { projectId: "project-a", creativeBriefReference: { briefId: creativeBrief.id, briefRevisionId: creativeBrief.revisionId }, creativeBrief, canonicalProductContext: productContext, productContextFingerprint: fingerprint, platform: "TikTok", market: "Spain", languageContext };
  const value = draft();
  const script = foundation.adaptScriptDraftToStructuredScript(writerInput, value, "script-revision-a");
  return { writerInput, criticInput, value, script };
}

const metadata = { providerUsed: "deepseek", model: "mock", latencyMs: 5, repairAttempted: false };
const pass = { verdict: "pass", issues: [], summary: "脚本可以使用。" };
const issue = (value, targetRef = "HOOK_LINE") => ({ code: "weak_hook_execution", severity: "major", targetRef, target: { scope: "hook", field: "line" }, message: "开头不够直接。", rewriteInstruction: "只增强开头。", deterministic: false, briefField: "opening.hookLine", ...value });

test("bounded flow calls Writer and Critic once, and skips rewrite when Critic accepts", async () => {
  const input = setup(); const calls = { writer: 0, critic: 0, rewrite: 0 };
  const result = await orchestration.orchestrateFinalScript(input, {
    write: async () => { calls.writer++; return { script: input.script, draft: input.value, metadata }; },
    critique: async () => { calls.critic++; return { critique: pass, metadata }; },
    rewrite: async () => { calls.rewrite++; throw new Error("must not run"); },
  });
  assert.equal(result.status, "success"); assert.deepEqual(calls, { writer: 1, critic: 1, rewrite: 0 });
  assert.equal(result.script.revisionId, "script-revision-a"); assert.equal(result.rewritten, false);
});

test("authorized Critic issues cause one atomic rewrite and preserve Revision A", async () => {
  const input = setup(); const source = structuredClone(input.script); let rewriteInput;
  const nextDraft = draft({ hook: { ...draft().hook, line: "先看这个安装步骤。" } });
  const nextScript = foundation.adaptScriptDraftToStructuredScript(input.writerInput, nextDraft, "script-revision-b");
  const result = await orchestration.orchestrateFinalScript(input, {
    write: async () => ({ script: input.script, draft: input.value, metadata }),
    critique: async () => ({ critique: { verdict: "needs_rewrite", issues: [issue({})], summary: "需要局部优化。" }, metadata }),
    rewrite: async value => { rewriteInput = value; return { script: nextScript, draft: nextDraft, metadata: { ...metadata, providerCalls: 1 } }; },
  });
  assert.equal(result.status, "success"); assert.equal(result.rewritten, true); assert.deepEqual(result.calls, { writer: 1, critic: 1, rewrite: 1 });
  assert.equal(result.script.revisionId, "script-revision-b"); assert.deepEqual(input.script, source);
  assert.equal(rewriteInput.issues[0].targetRef, "HOOK_LINE"); assert.equal(rewriteInput.issues[0].expectedCurrentValue, input.value.hook.line);
});

test("invalid Critic address fails safely before rewrite and cannot create a fake Final", async () => {
  const input = setup(); let rewrites = 0;
  const result = await orchestration.orchestrateFinalScript(input, {
    write: async () => ({ script: input.script, draft: input.value, metadata }),
    critique: async () => ({ critique: { verdict: "needs_rewrite", issues: [issue({ target: { scope: "hook", field: "line" } }, "inventedAlias")] }, metadata }),
    rewrite: async () => { rewrites++; throw new Error("must not run"); },
  });
  assert.equal(result.status, "failure"); assert.equal(result.code, "critic_issues_not_safely_targetable"); assert.equal(rewrites, 0);
});

test("rewrite failure is atomic and does not return a partial Final", async () => {
  const input = setup();
  const result = await orchestration.orchestrateFinalScript(input, {
    write: async () => ({ script: input.script, draft: input.value, metadata }),
    critique: async () => ({ critique: { verdict: "needs_rewrite", issues: [issue({})] }, metadata }),
    rewrite: async () => { throw new Error("rewrite_failed"); },
  });
  assert.equal(result.status, "failure"); assert.equal(result.stage, "rewrite"); assert.deepEqual(result.calls, { writer: 1, critic: 1, rewrite: 1 }); assert.equal("script" in result, false);
});

test("canonical Script carries source language, target language, fingerprint and Brief lineage", () => {
  const input = setup();
  assert.equal(input.script.workspaceLanguage, "zh-CN"); assert.equal(input.value.targetLanguage, "Spanish"); assert.equal(input.script.localizationStatus, "source");
  assert.equal(input.script.productContextFingerprint, input.writerInput.productContextFingerprint);
  assert.equal(input.script.sourceCreativeBriefId, input.writerInput.creativeBrief.id); assert.equal(input.script.sourceCreativeBriefRevisionId, input.writerInput.creativeBrief.revisionId);
});

test("default Script experience hides internal orchestration and legacy race", async () => {
  const component = await readFile(new URL("../app/components/script/final-script-stage.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(component, /生成高质量脚本/); assert.match(component, /确认脚本并进入导演/); assert.match(component, /AI 已检查/);
  assert.doesNotMatch(component, />Writer<|>Critic<|>C-4<|targetRef|patchId|fingerprint|Provider race/);
  assert.match(page, /<FinalScriptStage/); assert.match(page, /scriptEditorOpen&&acceptedCurrentScript&&<ScriptStudio/);
});
