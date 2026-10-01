import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";
import { fileURLToPath } from "node:url";

const jiti = createJiti(fileURLToPath(import.meta.url), { interopDefault: true });
const production = jiti.import("../app/image-production.ts");

const reference = (shotId, frameType, context = "ctx-current") => ({ type: "frame-prompt", projectId: "project-a", scriptIdentity: `director:${context}`, sourceScriptRevisionId: "script-r1", scriptVersion: "Script V1", shotId, sourceBlockId: `block-${shotId}`, frameType, promptType: frameType });
const asset = (id, shotId, frameType, context = "ctx-current") => ({ id, prompt: "中文提示词", imageType: "TikTok Ad Creative", style: "UGC", camera: "Close Up", ratio: "9:16", projectId: "project-a", imageUrl: `https://example.com/${id}.png`, provider: "doubao", model: "image-model", createdAt: new Date().toISOString(), metadata: { size: "9:16", sourceReference: reference(shotId, frameType, context) } });
const query = (shotId, frameType) => ({ projectId: "project-a", scriptIdentity: "director:ctx-current", scriptVersion: "Script V1", shotId, frameType });

test("UX-5 asset selection remains isolated by shot, frame type, and director context", async () => {
  const assets = [asset("a-start", "shot-a", "start-frame"), asset("a-end", "shot-a", "end-frame"), asset("b-start", "shot-b", "start-frame"), asset("stale", "shot-a", "start-frame", "ctx-old")];
  assert.deepEqual((await production).frameVariants(assets, query("shot-a", "start-frame")).map((item) => item.id), ["a-start"]);
  assert.deepEqual((await production).frameVariants(assets, query("shot-a", "end-frame")).map((item) => item.id), ["a-end"]);
  assert.deepEqual((await production).frameVariants(assets, query("shot-b", "start-frame")).map((item) => item.id), ["b-start"]);
});

test("UX-5 adoption reuses an existing asset and preserves variant history", async () => {
  const assets = [asset("new", "shot-a", "start-frame"), asset("old", "shot-a", "start-frame")];
  const adopted = (await production).adoptExistingImageAsset(assets, "old");
  assert.equal(adopted.length, 2);
  assert.equal(adopted[0].id, "old");
  assert.equal((await production).adoptedFrameAsset(adopted, query("shot-a", "start-frame")).id, "old");
});

test("UX-5 completion derives from canonical required prompts and adopted assets", async () => {
  const two = (await production).requiredFrameTypes({ startFramePrompt: "首帧", endFramePrompt: "尾帧" });
  const one = (await production).requiredFrameTypes({ startFramePrompt: "首帧", endFramePrompt: "" });
  assert.deepEqual(two, ["start-frame", "end-frame"]);
  assert.deepEqual(one, ["start-frame"]);
  assert.equal((await production).imageProductionStatus(two, []), "not-started");
  assert.equal((await production).imageProductionStatus(two, ["start-frame"]), "in-progress");
  assert.equal((await production).imageProductionStatus(two, ["start-frame", "end-frame"]), "complete");
  assert.equal((await production).nextIncompleteShotIndex(["complete", "in-progress", "not-started"], 0), 1);
});

test("UX-5 default Images stage is shot-centered and keeps advanced legacy entry points", async () => {
  const [page, workspace] = await Promise.all([readFile(new URL("../app/page.tsx", import.meta.url), "utf8"), readFile(new URL("../app/image-production-workspace.tsx", import.meta.url), "utf8")]);
  assert.match(page, /active === "images" && <ImageProductionWorkspace/);
  for (const marker of ["镜头导航", "当前镜头", "首帧", "尾帧", "查看提示词", "采用此版本", "重新生成", "下一镜头", "图片阶段已完成", "视频阶段暂未开放"]) assert.ok(workspace.includes(marker), marker);
  assert.match(workspace, /onNavigate\("frames"\)/);
  assert.match(workspace, /onNavigate\("assets"\)/);
  assert.doesNotMatch(workspace, />生成视频</);
});

test("UX-5 reuses current prompt and image runtimes without a second provider path", async () => {
  const workspace = await readFile(new URL("../app/image-production-workspace.tsx", import.meta.url), "utf8");
  for (const marker of ["buildFramePrompts", "effectiveFramePrompts", "saveFramePromptOverride", "generateAndSaveImage", "shotImageSpec", "ImageSourceReference", "sourceScriptRevisionId", "scriptIdentity", "shotId", "frameType"]) assert.ok(workspace.includes(marker), marker);
  assert.doesNotMatch(workspace, /fetch\(/);
});

test("UX-5 hides identity by default and keeps prompts and diagnostics collapsed", async () => {
  const workspace = await readFile(new URL("../app/image-production-workspace.tsx", import.meta.url), "utf8");
  assert.match(workspace, /<details className="image-frame-prompt">/);
  assert.match(workspace, /<details className="image-production-advanced">/);
  assert.match(workspace, /请先完成当前脚本的镜头设计/);
  assert.doesNotMatch(workspace, /<h[1-3][^>]*>[^<]*(sourceReference|request ID|directorContextId)/i);
});
