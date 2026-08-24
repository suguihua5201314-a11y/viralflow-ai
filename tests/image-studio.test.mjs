import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const studio = fs.readFileSync(new URL("../app/image-studio.tsx", import.meta.url), "utf8");
const router = fs.readFileSync(new URL("../app/image-provider-router.ts", import.meta.url), "utf8");
const assets = fs.readFileSync(new URL("../app/image-assets.ts", import.meta.url), "utf8");
const memory = fs.readFileSync(new URL("../app/project-memory.ts", import.meta.url), "utf8");

test("Image Studio is an independent workspace route", () => {
  assert.match(page, /active === "images"/);
  assert.match(studio, /Image Settings/);
  assert.match(studio, /Image Canvas/);
  assert.match(studio, /Generation History/);
});

test("all requested creation controls are available", () => {
  for (const value of ["Product Image", "UGC Creator", "TikTok Ad Creative", "Lifestyle Scene", "Realistic", "Premium", "Cinematic", "E-commerce", "Close Up", "Macro", "Wide Shot", "Handheld", "9:16", "1:1", "16:9", "Multilingual Prompt"]) assert.match(studio, new RegExp(value.replace(":", "\\:")));
});

test("generation stays disabled until prompt and project are selected", () => {
  assert.match(studio, /disabled={!prompt\.trim\(\) \|\| !projectId}/);
  assert.match(studio, /Step 6\.1 不会自动调用模型/);
});

test("history assets preserve metadata and project association", () => {
  for (const field of ["prompt", "style", "ratio", "createdAt", "model", "projectId"]) assert.match(assets, new RegExp(field));
  assert.match(assets, /asset\.projectId === projectId/);
  assert.match(studio, /assetsForProject/);
});

test("image providers use a router and remain reserved adapters", () => {
  assert.match(router, /ImageProviderAdapter/);
  assert.match(router, /openai-image/);
  assert.match(router, /doubao-image/);
  assert.match(router, /routeImageGeneration/);
  assert.doesNotMatch(studio, /fetch\(/);
});

test("Project Memory schema remains V1 and unchanged", () => {
  assert.match(memory, /PROJECT_MEMORY_VERSION = 1/);
  assert.doesNotMatch(memory, /imageAssets/);
});
