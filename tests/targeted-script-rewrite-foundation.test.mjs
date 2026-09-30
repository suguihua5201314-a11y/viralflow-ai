import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";
import { draft, makeInput } from "./targeted-script-rewrite-fixtures.mjs";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const runtime = await jiti.import("../app/brief-driven-script-rewriter.ts");
const critic = await jiti.import("../app/brief-driven-script-critic.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");
const api = { ...runtime, ...critic };

test("every canonical Critic target can be patched atomically and only at its exact field", () => {
  const source = draft();
  for (const entry of critic.buildCriticReviewTargetCatalog(source)) {
    const input = makeInput(api, selection, { currentDraft: source, targetRef: entry.targetRef });
    const normalized = runtime.normalizeAuthorizedRewriteIssues(input);
    assert.deepEqual(normalized.issues, [], entry.targetRef);
    const applied = runtime.applyTargetedRewrite(input, normalized.patches, [{ patchId: "patch-1", replacementValue: "新的中文局部内容。" }]);
    assert.equal(applied.issues.length, 0, entry.targetRef);
    assert.equal(critic.resolveCriticTarget(applied.draft, entry.target).value, "新的中文局部内容。", entry.targetRef);
    assert.deepEqual(input.currentDraft, source, `immutable ${entry.targetRef}`);
  }
});

test("unknown refs, aliases, stale values and wrong revisions fail before Provider", () => {
  for (const input of [
    makeInput(api, selection, { targetRef: "hookText", issues: [{ patchId: "patch-1", sourceScriptRevisionId: "script-revision-a", targetRef: "hookText", resolvedTarget: { scope: "hook", field: "line" }, expectedCurrentValue: "x", issueCode: "weak_hook_execution", severity: "major", message: "问题。", rewriteInstruction: "修改。" }] }),
    (() => { const value = makeInput(api, selection); value.issues[0].expectedCurrentValue = "旧值"; return value; })(),
    (() => { const value = makeInput(api, selection); value.issues[0].sourceScriptRevisionId = "script-revision-b"; return value; })(),
  ]) assert.ok(runtime.validateTargetedRewriteInput(input).length);
});

test("strict Provider output accepts exact patch IDs and rejects addressing, full Script, unknown, duplicate, missing and blank replacements", () => {
  const input = makeInput(api, selection);
  const patches = runtime.normalizeAuthorizedRewriteIssues(input).patches;
  assert.ok(runtime.parseTargetedRewriteOutput(JSON.stringify({ replacements: [{ patchId: "patch-1", replacementValue: "新的中文开头。" }] }), patches).value);
  for (const value of [
    { replacements: [{ patchId: "unknown", replacementValue: "内容" }] },
    { replacements: [] },
    { replacements: [{ patchId: "patch-1", replacementValue: "内容" }, { patchId: "patch-1", replacementValue: "内容" }] },
    { replacements: [{ patchId: "patch-1", replacementValue: " " }] },
    { replacements: [{ patchId: "patch-1", replacementValue: "内容", targetRef: "HOOK_LINE" }] },
    { replacements: [{ patchId: "patch-1", replacementValue: "内容", path: "hook.line" }] },
    { replacements: [{ patchId: "patch-1", replacementValue: "内容", sceneId: "hook" }] },
    { replacements: [{ patchId: "patch-1", replacementValue: "内容" }], script: draft() },
  ]) assert.equal(runtime.parseTargetedRewriteOutput(JSON.stringify(value), patches).value, null);
});

test("FULL_NARRATION and scene dialogue stay independent", () => {
  const source = draft();
  const input = makeInput(api, selection, { currentDraft: source, targetRef: "FULL_NARRATION" });
  const patches = runtime.normalizeAuthorizedRewriteIssues(input).patches;
  const applied = runtime.applyTargetedRewrite(input, patches, [{ patchId: "patch-1", replacementValue: "新的完整旁白。" }]);
  assert.equal(applied.draft.fullNarration, "新的完整旁白。");
  assert.deepEqual(applied.draft.scenes, source.scenes);
});

test("wrong language and unsafe claims reject the entire batch without mutating the source", () => {
  for (const replacementValue of ["English replacement only.", "永不碎", "保证100%有效"]) {
    const input = makeInput(api, selection);
    const before = structuredClone(input.currentDraft);
    const patches = runtime.normalizeAuthorizedRewriteIssues(input).patches;
    const result = runtime.applyTargetedRewrite(input, patches, [{ patchId: "patch-1", replacementValue }]);
    assert.equal(result.draft, null, replacementValue);
    assert.deepEqual(input.currentDraft, before);
  }
});

test("duplicate compatible targets normalize and conflicting instructions fail", () => {
  const compatible = makeInput(api, selection);
  compatible.issues.push({ ...compatible.issues[0], patchId: "patch-2" });
  assert.equal(runtime.normalizeAuthorizedRewriteIssues(compatible).patches.length, 1);
  const conflict = makeInput(api, selection);
  conflict.issues.push({ ...conflict.issues[0], patchId: "patch-2", rewriteInstruction: "换成完全不同策略。" });
  assert.ok(runtime.normalizeAuthorizedRewriteIssues(conflict).issues.some((item) => item.code === "conflicting_target_instructions"));
});
