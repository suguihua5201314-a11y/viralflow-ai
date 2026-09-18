import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const navigation = fs.readFileSync(new URL("../app/navigation.ts", import.meta.url), "utf8");
const sidebar = fs.readFileSync(new URL("../app/components/layout/sidebar.tsx", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../app/image-studio.tsx", import.meta.url), "utf8");
const workspace = fs.readFileSync(new URL("../app/project-asset-workspace.tsx", import.meta.url), "utf8");
const assets = fs.readFileSync(new URL("../app/image-assets.ts", import.meta.url), "utf8");
const memory = fs.readFileSync(new URL("../app/project-memory.ts", import.meta.url), "utf8");
const directorImage = fs.readFileSync(new URL("../app/director-shot-image.tsx", import.meta.url), "utf8");
const directorUi = fs.readFileSync(new URL("../app/styles/director-intelligence-ui.css", import.meta.url), "utf8");

test("Step 7.0-C 1: Assets 与 Script History 使用独立 routing", () => {
  assert.match(navigation, /"assets"/);
  assert.match(page, /active === "assets"/);
  assert.match(page, /active === "history"/);
  assert.match(sidebar, /id:"assets".*label:"素材库"/);
  assert.match(sidebar, /id: "history".*label: "脚本历史"/);
});

test("Step 7.0-C 2/3: Images 与 Assets 均使用 Project Workspace", () => {
  assert.match(studio, /ProjectAssetWorkspace mode="images"/);
  assert.match(page, /ProjectAssetWorkspace mode="assets"/);
  assert.match(page, /active==="images"\|\|active==="assets"/);
  assert.match(sidebar, /active==="images"\|\|active==="assets"/);
});

test("Step 7.0-C 4/5: currentProjectId 是唯一项目来源且切换会重新读取 Store", () => {
  assert.match(workspace, /data-project-id=\{currentProjectId \|\| "none"\}/);
  assert.match(workspace, /const stored = readImageAssets\(\)/);
  assert.match(workspace, /assetsForProject\(stored, currentProjectId\)/);
  assert.match(workspace, /\[currentProjectId, mode\]/);
  assert.doesNotMatch(workspace, /setProjectId|aria-label="项目"/);
});

test("Step 7.0-C 6/7: Source 只由现有 sourceReference 分类", () => {
  assert.match(assets, /sourceReference\?\.type === "director-shot" \? "导演分镜" : "AI图片创作"/);
  assert.match(workspace, /imageAssetSource\(asset\)/);
});

test("Step 7.0-C 8: 同 Shot Current 由 shotId 与 createdAt 推导", () => {
  assert.match(assets, /currentDirectorAssetIds/);
  assert.match(assets, /Date\.parse\(asset\.createdAt\) > Date\.parse\(latest\.createdAt\)/);
  assert.match(workspace, /currentIds\.has\(asset\.id\).*当前版本/s);
  assert.doesNotMatch(memory, /currentAsset|imageAssets|shotImages/);
});

test("Step 7.0-C 9/10: Draft 与 Regenerate 保留 sourceReference", () => {
  assert.match(workspace, /setSourceReference\(draft\.sourceReference \|\| null\)/);
  assert.match(workspace, /metadata: \{ size: data\.image\.metadata\?\.size.*requestId: data\.image\.metadata\?\.requestId.*sourceReference: preservedReference/s);
  assert.match(workspace, /generateImage\(selectedAsset\.prompt, selectedAsset\.metadata\?\.sourceReference \|\| null, selectedAsset\)/);
  assert.match(workspace, /shotId/);
  assert.match(workspace, /sourceBlockId/);
});

test("Step 7.0-C 11: Inspector 展示完整真实 metadata", () => {
  for (const field of ["模型", "服务商", "比例", "风格", "镜头", "创建时间", "项目", "来源", "分镜 ID", "来源区块 ID", "请求 ID"]) assert.match(workspace, new RegExp(field));
  for (const action of ["查看大图", "复制提示词", "使用提示词", "重新生成", "返回导演分镜"]) assert.match(workspace, new RegExp(action));
  assert.doesNotMatch(workspace, /Set as Current Shot Image|Delete Asset/);
});

test("Step 7.0-C 12: Asset Library 提供真实 Search、Filter 与 Tabs", () => {
  for (const tab of ["全部", "图片", "参考素材", "声音", "视频"]) assert.match(workspace, new RegExp(`label: "${tab}"`));
  for (const filter of ["来源筛选", "分镜筛选", "模型筛选", "创建时间筛选"]) assert.match(workspace, new RegExp(filter));
  assert.match(workspace, /搜索提示词、分镜 ID、来源/);
  assert.match(workspace, /tab === "references" && !asset\.metadata\?\.sourceReference/);
});

test("Step 7.0-C 13: Script History 查看、Director 与 Excel 能力保留", () => {
  assert.match(page, /active === "history".*全部脚本/s);
  assert.match(page, />查看<\/button>/);
  assert.match(page, />AI 导演<\/button>/);
  assert.match(page, /exportExcel\(item\)/);
});

test("Step 7.0-C 14: 唯一 Image Store 与现有 API/Director loop 保持不变", () => {
  assert.match(assets, /viralflow-image-assets-v1/);
  assert.match(workspace, /fetch\("\/api\/images\/generate"/);
  assert.match(workspace, /readImageAssets/);
  assert.doesNotMatch(memory, /sourceReference|imageAssets|shotImages/);
});

test("Step 7.0-C.1: Director 图片操作在桌面布局保持可访问", () => {
  assert.match(directorImage, /className="shot-image-details"/);
  assert.match(directorImage, /aria-label="镜头图片操作"/);
  assert.match(directorUi, /\.vf-director-mode \.shot-image-details\{[^}]*display:block/);
  assert.match(directorUi, /\.vf-director-mode \.shot-image-details nav\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(directorUi, /\.vf-director-mode \.shot-image-result>div\{display:none\}/);
});

test("Step 7.0-C.1: Prompt 长度在调用 API 前完成前端校验", () => {
  assert.match(workspace, /const MAX_PROMPT_LENGTH = 2000/);
  const validationIndex = workspace.indexOf("promptValue.length > MAX_PROMPT_LENGTH");
  const fetchIndex = workspace.indexOf('fetch("/api/images/generate"', validationIndex);
  assert.ok(validationIndex >= 0 && fetchIndex > validationIndex, "长度校验必须发生在 POST 之前");
  assert.match(workspace, /提示词最多支持 \$\{MAX_PROMPT_LENGTH\} 个字符/);
  assert.match(workspace, /prompt\.length > MAX_PROMPT_LENGTH/);
  assert.match(workspace, /\{prompt\.length\} \/ \{MAX_PROMPT_LENGTH\}/);
});
