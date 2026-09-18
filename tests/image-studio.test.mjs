import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../app/image-studio.tsx", import.meta.url), "utf8");
const workspace = fs.readFileSync(new URL("../app/project-asset-workspace.tsx", import.meta.url), "utf8");
const router = fs.readFileSync(new URL("../app/image-provider-router.ts", import.meta.url), "utf8");
const route = fs.readFileSync(new URL("../app/api/images/generate/route.ts", import.meta.url), "utf8");
const assets = fs.readFileSync(new URL("../app/image-assets.ts", import.meta.url), "utf8");
const memory = fs.readFileSync(new URL("../app/project-memory.ts", import.meta.url), "utf8");
const navigation = fs.readFileSync(new URL("../app/navigation.ts", import.meta.url), "utf8");

test("A: AI 图片工作台升级为 Project Creative Board", () => {
  for (const value of ["AI图片创作工作台", "素材详情", "图片生成器", "当前项目", "搜索提示词、分镜 ID、来源", "开始创建第一个视觉素材"]) assert.match(studio + workspace + navigation, new RegExp(value));
  for (const value of ["产品图", "UGC", "广告素材", "生活场景", "真实摄影", "高端商业", "电影质感", "特写", "微距", "广角", "手持"]) assert.match(workspace, new RegExp(value));
});

test("B: 图片生成 API 同时提供状态与 POST 生成入口", () => {
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /validateImageRequest/);
  assert.match(route, /maxDuration = 180/);
  assert.match(route, /Response\.json\(\{ image: await routeImageGeneration/);
});

test("C: API 通过 Image Provider Router 调用真实豆包 Ark Adapter", () => {
  assert.match(route, /routeImageGeneration\(provider, body\)/);
  assert.match(router, /ImageProviderAdapter/);
  assert.match(router, /https:\/\/ark\.cn-beijing\.volces\.com\/api\/v3\/images\/generations/);
  assert.match(router, /doubao-seedream-4-0-250828/);
  assert.match(router, /process\.env\.ARK_API_KEY/);
  assert.match(router, /response_format: "url"/);
  assert.match(route, /activeProvider: "doubao-image"/);
  assert.match(router, /doubaoImageAdapter/);
  assert.doesNotMatch(studio + workspace, /ark\.cn-beijing\.volces\.com/);
});

test("D: 生成成功组装并保存完整 Image Asset", () => {
  for (const field of ["imageUrl", "prompt", "imageType", "style", "camera", "ratio", "model", "createdAt", "projectId", "metadata"]) assert.match(assets + workspace + router, new RegExp(field));
  assert.match(workspace, /saveImageAssets\(next\)/);
  assert.match(assets, /assets\.slice\(0, IMAGE_ASSET_LIMIT\)/);
  assert.match(assets, /asset\.projectId === projectId/);
});

test("E: 历史记录展示真实图片并按项目过滤", () => {
  assert.match(workspace, /assetsForProject\(assets, currentProjectId\)/);
  assert.match(workspace, /selectedAssetId/);
  assert.match(workspace, /asset\.imageUrl/);
  assert.match(workspace, /new Date\(asset\.createdAt\)\.toLocaleString/);
});

test("F: Loading、失败恢复和重新生成状态完整", () => {
  assert.match(workspace, /status === "loading"/);
  assert.match(workspace, /生成失败/);
  assert.match(workspace, /error\.retryable/);
  assert.match(workspace, /重新尝试/);
  assert.match(workspace, /生成成功/);
  assert.match(workspace, /查看大图/);
  for (const category of ["configuration", "unauthorized", "rate_limit", "moderation_blocked", "timeout", "invalid_request", "provider_error", "empty_result"]) assert.match(router, new RegExp(category));
});

test("图片模型选择默认豆包，OpenAI 未启用时不可选", () => {
  assert.match(workspace, /aria-label="图片模型"/);
  assert.match(workspace, /selectedProvider.*doubao-image/);
  assert.match(workspace, /disabled=\{!item\.configured\}/);
  assert.match(router, /OpenAI 图片模型当前未启用/);
  assert.doesNotMatch(router, /OPENAI_API_KEY|api\.openai\.com/);
});

test("G: 现有功能与 Project Memory Schema 保持不变", () => {
  assert.match(page, /<ScriptStudio/);
  assert.match(page, /<ViralAnalyzer/);
  assert.match(page, /<ViralReplication/);
  assert.match(page, /<ShootingDirector/);
  assert.match(page, /<VoiceStudio/);
  assert.match(memory, /PROJECT_MEMORY_VERSION = 1/);
  assert.doesNotMatch(memory, /imageAssets/);
});
