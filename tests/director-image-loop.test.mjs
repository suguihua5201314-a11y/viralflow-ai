import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const helper = fs.readFileSync(new URL("../app/director-image.ts", import.meta.url), "utf8");
const panel = fs.readFileSync(new URL("../app/director-shot-image.tsx", import.meta.url), "utf8");
const action = fs.readFileSync(new URL("../app/image-generation-action.ts", import.meta.url), "utf8");
const director = fs.readFileSync(new URL("../app/shooting-director.tsx", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/images/generate/route.ts", import.meta.url), "utf8");
const provider = fs.readFileSync(new URL("../app/image-provider-router.ts", import.meta.url), "utf8");
const assets = fs.readFileSync(new URL("../app/image-assets.ts", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../app/image-studio.tsx", import.meta.url), "utf8");
const workspace = fs.readFileSync(new URL("../app/project-asset-workspace.tsx", import.meta.url), "utf8");
const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const memory = fs.readFileSync(new URL("../app/project-memory.ts", import.meta.url), "utf8");

test("Step 6.3 A: Shot Image Prompt 使用现有画面、镜头、动作、产品与 Proof", () => {
  for (const field of ["visualDescription", "framing", "cameraAngle", "cameraMovement", "talentAction", "productAction", "proofRequirement", "purpose", "environment"]) assert.match(helper, new RegExp(field));
  for (const context of ["product", "platform", "market", "creativeMode"]) assert.match(helper, new RegExp(`input\\.context\\.${context}`));
  assert.match(helper, /不得添加未授权功能、参数、包装、效果、促销/);
  assert.match(helper, /slice\(0, 1900\)/);
});

test("Step 6.3 B/C: Director 复用 POST images generate 与 Image Provider Router", () => {
  assert.match(panel, /generateAndSaveImage\(\{ request: spec, sourceReference/);
  assert.match(action, /fetch\("\/api\/images\/generate"/);
  assert.match(action, /JSON\.stringify\(request\)/);
  assert.match(route, /routeImageGeneration\(provider, body\)/);
  assert.match(provider, /doubaoImageAdapter/);
  assert.doesNotMatch(director + panel, /\/api\/director-image/);
});

test("Step 6.3 D: 单镜头成功后展示真实图片、Prompt、模型与时间", () => {
  assert.match(action, /validImageUrl/);
  assert.match(panel, /<Image src=\{asset\.imageUrl\}/);
  assert.match(panel, /asset\.prompt/);
  assert.match(panel, /asset\.model/);
  assert.match(panel, /new Date\(asset\.createdAt\)\.toLocaleString/);
  for (const label of ["生成镜头图片", "正在生成...", "已生成", "生成失败 · 重试", "查看大图"]) assert.match(panel, new RegExp(label.replaceAll(".", "\\.")));
});

test("Step 6.3 E/F: Image Asset 使用 metadata sourceReference 关联 Project 与 Shot", () => {
  assert.match(action, /saveImageAssets\(next\)/);
  assert.match(panel, /request: spec/);
  assert.match(panel + assets, /sourceReference/);
  assert.match(panel, /type: "director-shot", projectId: spec\.projectId, shotId: shot\.shotId, sourceBlockId: shot\.sourceBlockId/);
  assert.doesNotMatch(memory, /sourceReference|imageAssets|shotImages/);
});

test("Step 6.3 G: 重新生成创建新 ID 并保留已有图片资产", () => {
  assert.match(panel, /assetIdPrefix: "director-image"/);
  assert.match(action, /\.\.\.readImageAssets\(\)\.filter/);
  assert.match(assets, /IMAGE_ASSET_LIMIT = 60/);
  assert.match(panel, /重新生成/);
});

test("Step 6.3 H: 错误状态仅属于当前 Shot 并允许重试", () => {
  assert.match(panel, /useState<ImageStatus>/);
  assert.match(panel, /setStatus\("error"\)/);
  assert.match(panel, /role="alert"/);
  assert.match(panel, /重试当前镜头/);
  assert.match(panel, /status === "loading"/);
});

test("Step 6.3 I: Image Studio 联动携带项目、Prompt 与图片参数", () => {
  assert.match(panel, /saveImageStudioDraft\(\{ \.\.\.spec/);
  assert.match(panel, /onNavigate\?\.\(\)/);
  assert.match(director, /onNavigate\?\.\("images"\)/);
  assert.match(workspace, /takeImageStudioDraft\(\)/);
  for (const setter of ["setPrompt", "setImageType", "setStyle", "setCamera", "setRatio", "setSourceReference"]) assert.match(workspace, new RegExp(`${setter}\\(draft\\.`));
});

test("Step 6.3 Regression: 原 Director、各工作台和 Project Memory 保持原链路", () => {
  for (const value of ["<ScriptStudio", "<ViralAnalyzer", "<ViralReplication", "<ShootingDirector", "<VoiceStudio", "<ImageStudio"]) assert.match(page, new RegExp(value));
  for (const value of ["onToggleLock", "duplicateShot", "deleteShot", "reorderShots", "updateShot"]) assert.match(director, new RegExp(value));
  assert.match(memory, /PROJECT_MEMORY_VERSION = 1/);
});
