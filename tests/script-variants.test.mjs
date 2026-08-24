import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync(new URL("../app/script-variants.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const module = { exports: {} };
new Function("module", "exports", compiled)(module, module.exports);
const { appendScriptVariant } = module.exports;

test("连续生成三个方案时无需刷新且结果独立保留", () => {
  let variants = [];
  for (let index = 1; index <= 3; index += 1) {
    const next = appendScriptVariant(
      variants,
      { id: index, title: `方案 ${index}`, product: "测试产品", narration: `独立文案 ${index}` },
      [{ text: `独立段落 ${index}` }],
    );
    variants = next.variants;
    assert.equal(next.activeIndex, index - 1);
    assert.equal(next.added, true);
  }

  assert.deepEqual(variants.map((item) => item.label), ["V1", "V2", "V3"]);
  assert.equal(new Set(variants.map((item) => item.identity)).size, 3);
  variants[2].blocks[0].text = "仅修改 V3";
  assert.equal(variants[0].blocks[0].text, "独立段落 1");
  assert.equal(variants[1].blocks[0].text, "独立段落 2");
});

test("相同生成结果不会重复创建方案", () => {
  const script = { id: 8, title: "方案", product: "产品", narration: "文案" };
  const first = appendScriptVariant([], script, [{ text: "段落" }]);
  const duplicate = appendScriptVariant(first.variants, script, [{ text: "段落" }]);
  assert.equal(duplicate.variants.length, 1);
  assert.equal(duplicate.added, false);
  assert.equal(duplicate.activeIndex, 0);
});

test("脚本工作台保留核心能力并提供完整下一步入口", () => {
  const studio = fs.readFileSync(new URL("../app/script-studio.tsx", import.meta.url), "utf8");
  for (const marker of ["onGenerateRace", "checkCompliance", "创作需求", "优化当前脚本", "生成新方案", "进入 AI 导演", "AI 语音", "generationState"]) {
    assert.ok(studio.includes(marker), `missing ${marker}`);
  }
});
