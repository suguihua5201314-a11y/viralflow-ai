import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const stages = await jiti.import("../app/production-stage.ts");
const read = path => readFile(new URL(path, import.meta.url), "utf8");
const stage = await read("../app/components/director/director-stage.tsx");
const director = await read("../app/shooting-director.tsx");
const styles = await read("../app/styles/director-workspace-v2.css");
const memory = await read("../app/project-memory.ts");

test("Director stage leads with the accepted Script summary and one state-specific primary action", () => {
  assert.match(stage, /当前脚本摘要/);
  assert.match(stage, /script\.title/);
  assert.match(stage, /script\.hook/);
  assert.match(stage, /script\.duration/);
  assert.match(stage, /script\.sceneCount/);
  assert.match(stage, /生成镜头/);
  assert.match(stage, /确认镜头并进入图片/);
  assert.match(director, /scriptRevisionId/);
  assert.match(director, /onContinueToImages=\{\(\) => \{ confirmList\(\); onNavigate\?\.\("images"\); \}\}/);
});

test("default Shot cards expose production essentials and keep camera metadata collapsed", () => {
  for (const label of ["画面", "动作", "台词 / 口播", "产品任务", "查看镜头详情"])
    assert.match(stage, new RegExp(label));
  for (const value of ["visualDescription", "talentAction", "productAction", "dialogue", "voiceover", "proofRequirement"])
    assert.match(stage, new RegExp(`shot\\.${value}`));
  assert.match(stage, /<details>/);
  for (const label of ["景别", "机位", "镜头运动", "转场", "剪辑", "声音", "连续性"])
    assert.match(stage, new RegExp(label));
  assert.doesNotMatch(stage, /contextId|sourceScriptRevisionId|fingerprint|raw provider|schema path/i);
});

test("shot order and identity come directly from the canonical Director workspace", () => {
  assert.match(stage, /shots\.map\(\(shot, index\)/);
  assert.match(stage, /key=\{shot\.shotId\}/);
  assert.match(stage, /data-shot-id=\{shot\.shotId\}/);
  assert.match(director, /shots=\{shots\}/);
  assert.match(director, /onSelect=\{selectShot\}/);
  assert.match(director, /regenerateWithDirection\(index, value\)/);
  assert.match(director, /onAcceptModification=\{acceptPreview\}/);
});

test("generation, regeneration, progress and stale states use plain user language", () => {
  for (const label of ["正在分析脚本", "正在拆分镜头", "正在完善画面和动作", "重新生成镜头"])
    assert.match(stage + director, new RegExp(label));
  assert.match(director, /脚本已经更新，需要重新生成镜头/);
  assert.match(director, /旧镜头已安全保留/);
  assert.doesNotMatch(stage, /Director request|context hash mismatch|sourceScriptRevisionId mismatch/);
});

test("technical workspace is hidden while diagnostics and modification remain progressive disclosures", () => {
  assert.match(styles, /\.os-director-vnext-legacy\s*\{\s*display:\s*none/s);
  assert.match(stage, /告诉 AI 你想怎么修改这个镜头/);
  assert.match(stage, /确认后才会替换当前镜头/);
  assert.match(stage, /<summary>诊断详情<\/summary>/);
  assert.match(stage, /<summary>查看镜头详情<\/summary>/);
});

test("Images availability remains derived from current Director context and persistence schema is unchanged", () => {
  const assets = { productContextCoherent: true, hasSelectedCreativeBrief: true, hasCurrentScriptRevision: true, hasCurrentDirectorContext: true, hasCurrentImageAssets: false };
  assert.equal(stages.productionStageStatuses("director", assets).images, "available");
  assert.equal(stages.productionStageStatuses("director", { ...assets, hasCurrentDirectorContext: false }).images, "locked");
  assert.match(memory, /currentDirectorContextId/);
  assert.doesNotMatch(memory, /ux4Director|directorStageComplete/);
});

test("UX-4 does not duplicate Creative, Brief, Script editor, Frame or Image workflows", () => {
  assert.doesNotMatch(stage, /CreativeDirection|CreativeBrief|ScriptStudio|FramePromptWorkspace|ImageStudio/);
  assert.match(director, /onNavigate\?\.\("images"\)/);
  assert.match(director, /onNavigate\?\.\("create"\)/);
});
