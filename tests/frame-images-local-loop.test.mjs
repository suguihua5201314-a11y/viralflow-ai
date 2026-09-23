import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadAssets() {
  const source = await read("app/image-assets.ts");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

const query = {
  projectId: "project-a",
  scriptIdentity: "script:101",
  scriptVersion: "Script V1",
  shotId: "shot-02",
  frameType: "start-frame",
};

function asset(id, createdAt, overrides = {}) {
  const sourceReference = {
    type: "frame-prompt",
    projectId: "project-a",
    scriptIdentity: "script:101",
    scriptVersion: "Script V1",
    shotId: "shot-02",
    sourceBlockId: "scene-2",
    frameType: "start-frame",
    promptType: "start-frame",
    ...overrides,
  };
  return {
    id,
    imageUrl: `https://example.com/${id}.png`,
    prompt: id,
    imageType: "ugc",
    style: "realistic",
    camera: "Close Up",
    ratio: "9:16",
    model: "seedream",
    provider: "doubao-image",
    createdAt,
    projectId: sourceReference.projectId,
    metadata: { size: "1024x1792", sourceReference },
  };
}

test("Phase 5.1: stable script identity reuses a real id and deterministic fallback", async () => {
  const { resolveScriptIdentity } = await loadAssets();
  assert.equal(resolveScriptIdentity(101, "Script V1"), "script:101");
  assert.equal(resolveScriptIdentity(undefined, "Script V1"), "version:Script V1");
});

test("Phase 5.1: Start and End Frame references match only their own frame", async () => {
  const { matchesFrameAsset } = await loadAssets();
  const start = asset("start", "2026-09-23T01:00:00.000Z");
  const end = asset("end", "2026-09-23T01:01:00.000Z", { frameType: "end-frame", promptType: "end-frame" });
  assert.equal(matchesFrameAsset(start, query), true);
  assert.equal(matchesFrameAsset(end, query), false);
  assert.equal(matchesFrameAsset(end, { ...query, frameType: "end-frame" }), true);
});

test("Phase 5.1: Shot 01 and Shot 02 do not share assets", async () => {
  const { matchesFrameAsset } = await loadAssets();
  assert.equal(matchesFrameAsset(asset("shot-01", "2026-09-23T01:00:00.000Z", { shotId: "shot-01" }), query), false);
  assert.equal(matchesFrameAsset(asset("shot-02", "2026-09-23T01:00:00.000Z"), query), true);
});

test("Phase 5.1: different scripts and revisions do not share new assets", async () => {
  const { matchesFrameAsset } = await loadAssets();
  assert.equal(matchesFrameAsset(asset("other-script", "2026-09-23T01:00:00.000Z", { scriptIdentity: "script:202", scriptVersion: "Script V2" }), query), false);
});

test("Phase 5.1: legacy assets remain readable through scriptVersion compatibility", async () => {
  const { matchesFrameAsset, frameReturnContext } = await loadAssets();
  const legacy = asset("legacy", "2026-09-23T01:00:00.000Z");
  delete legacy.metadata.sourceReference.scriptIdentity;
  assert.equal(matchesFrameAsset(legacy, query), true);
  assert.deepEqual(frameReturnContext(legacy.metadata.sourceReference), {
    view: "frames",
    projectId: "project-a",
    scriptIdentity: "version:Script V1",
    scriptVersion: "Script V1",
    shotId: "shot-02",
    frameType: "start-frame",
  });
});

test("Phase 5.1: regeneration preserves history and newest successful asset wins", async () => {
  const { newestFrameAsset } = await loadAssets();
  const first = asset("first", "2026-09-23T01:00:00.000Z");
  const second = asset("second", "2026-09-23T02:00:00.000Z");
  const history = [first, second];
  assert.equal(history.length, 2);
  assert.equal(newestFrameAsset(history, query)?.id, "second");
});

test("Phase 5.1: Draft and return navigation retain complete source context", async () => {
  const [frame, images, page] = await Promise.all([
    read("app/frame-prompt-workspace.tsx"),
    read("app/project-asset-workspace.tsx"),
    read("app/page.tsx"),
  ]);
  for (const field of ["projectId", "scriptIdentity", "scriptVersion", "shotId", "sourceBlockId", "frameType", "returnContext"])
    assert.match(frame, new RegExp(field));
  assert.match(images, /setReturnContext\(draft\.returnContext \|\| frameReturnContext/);
  assert.match(images, /if \(initializedContext\.current === contextKey\) return/);
  assert.match(images, /返回画面提示词 · \{returnContext\.shotId\}/);
  assert.match(page, /workspace\.shots\?\.findIndex\(shot=>shot\.shotId===context\.shotId\)/);
  assert.match(page, /currentProjectId:context\.projectId,activeView:"frames"/);
});

test("Phase 5.1: successful generation stays in the sole ImageAsset store", async () => {
  const [workspace, assets, memory] = await Promise.all([
    read("app/project-asset-workspace.tsx"),
    read("app/image-assets.ts"),
    read("app/project-memory.ts"),
  ]);
  assert.ok(workspace.includes("const next = [asset, ...readImageAssets().filter(item => item.id !== asset.id)]"));
  assert.match(assets, /viralflow-image-assets-v1/);
  assert.doesNotMatch(memory, /imageAssets|shotImages|generationStore/i);
});
