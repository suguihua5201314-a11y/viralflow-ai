import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
async function loadCommonJs(path) {
  const source = await read(path);
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", output)(module, module.exports);
  return module.exports;
}

const briefInput = {
  projectId: "project-a",
  productReference: { productName: "测试商品", contextFingerprint: "product-context-a" },
  sources: { recentScriptRevisionIds: ["script-revision-a"] },
  opportunity: { targetAudience: "目标用户", useMoment: "真实使用时刻", purchaseMotivation: "购买动机", creativeOpportunity: "值得制作的创意机会" },
  direction: { contentMechanisms: ["routine"], creativeAngle: "生活场景切入" },
  opening: { hookMechanism: "visual-question", hookLine: "你也遇到过这种情况吗？", visual: { subject: "人物与商品", setup: "真实场景", action: "开始使用", visibleChangeOrQuestion: "结果会怎样" } },
  truth: { primaryProductTruth: "已确认事实", secondaryProductTruths: [] },
  evidence: { type: "none-required", objective: "建立使用场景", visualEvidence: [], limitations: ["不虚构效果"] },
  ctaDirection: "自然建议",
  riskBoundaries: { prohibitedClaims: [], requiredQualifiers: [], safetyConstraints: [] },
  createdAt: "2026-09-24T00:00:00.000Z",
};

test("A-C Creative Brief identities are distinct and survive JSON reload", async () => {
  const api = await loadCommonJs("app/creative-contract.ts");
  const first = api.createCreativeBrief(briefInput), second = api.createCreativeBrief(briefInput);
  assert.match(first.id, /^creative-brief-/);
  assert.match(first.revisionId, /^creative-brief-revision-/);
  assert.notEqual(first.id, second.id);
  assert.notEqual(first.revisionId, second.revisionId);
  assert.deepEqual(JSON.parse(JSON.stringify(first)), first);
  const revised = api.reviseCreativeBrief(first, { ctaDirection: "新的自然建议" });
  assert.equal(revised.id, first.id);
  assert.notEqual(revised.revisionId, first.revisionId);
});

test("D-E Project Memory can save, reload and select a Creative Brief revision", async () => {
  const api = await loadCommonJs("app/creative-contract.ts");
  const brief = api.createCreativeBrief(briefInput);
  const revisions = api.appendCreativeBriefRevision(undefined, brief);
  const memory = JSON.parse(JSON.stringify({ version: 1, projects: [{ id: "project-a", assets: { scriptVersions: [], creativeBriefRevisions: revisions, currentCreativeBriefRevisionId: brief.revisionId } }] }));
  assert.equal(memory.projects[0].assets.creativeBriefRevisions[0].revisionId, brief.revisionId);
  assert.equal(memory.projects[0].assets.currentCreativeBriefRevisionId, brief.revisionId);
  assert.equal(api.appendCreativeBriefRevision(revisions, brief).length, 1);
});

test("F-G Script revisions retain Creative Brief lineage through serialization", async () => {
  const foundation = await loadCommonJs("app/script-foundation.ts");
  const script = foundation.ensureScriptRevision({ title: "脚本", product: "商品", narration: "正文" });
  const bound = foundation.bindScriptToCreativeBrief(script, { id: "creative-brief-a", revisionId: "creative-brief-revision-a" });
  const restored = JSON.parse(JSON.stringify(bound));
  assert.equal(restored.sourceCreativeBriefId, "creative-brief-a");
  assert.equal(restored.sourceCreativeBriefRevisionId, "creative-brief-revision-a");
  assert.equal(restored.revisionId, script.revisionId);
});

test("H-I legacy Scripts and Projects without Creative Brief fields remain valid", async () => {
  const foundation = await loadCommonJs("app/script-foundation.ts");
  const oldScript = { revisionId: "script-revision-old", title: "旧脚本", product: "旧商品", narration: "旧正文" };
  const oldProject = JSON.parse(JSON.stringify({ id: "old-project", assets: { scriptVersions: [oldScript] } }));
  assert.equal(foundation.scriptRevisionIdentity(oldProject.assets.scriptVersions[0]), "script-revision-old");
  assert.equal(oldProject.assets.creativeBriefRevisions, undefined);
});

test("J-L contract is provider neutral, supports none-required, and separates Hook from Opening Visual", async () => {
  const source = await read("app/creative-contract.ts");
  assert.doesNotMatch(source, /providerId|providerUsed|modelId|doubao|openai|claude/i);
  assert.match(source, /\| "none-required"/);
  assert.match(source, /hookLine: string/);
  assert.match(source, /visual: OpeningVisual/);
  for (const field of ["subject", "setup", "action"]) assert.match(source, new RegExp(`${field}: string`));
});

test("M Creative signals contain no deterministic category-to-mechanism mapping", async () => {
  const source = await read("app/creative-contract.ts");
  assert.doesNotMatch(source, /screen protector|mascara|toothpaste/i);
  assert.doesNotMatch(source, /functional\s*===?.*demonstration|aesthetic\s*===?.*before-after/i);
});

test("N Phase 5.6B Script Revision and Director binding remain intact", async () => {
  const [foundation, page, route] = await Promise.all([read("app/script-foundation.ts"), read("app/page.tsx"), read("app/api/director/route.ts")]);
  assert.match(foundation, /script-revision-/);
  assert.match(page, /scriptRevisionId:scriptRevisionIdentity\(result\)/);
  assert.match(route, /sourceScriptRevisionId:body\.scriptRevisionId/);
});
