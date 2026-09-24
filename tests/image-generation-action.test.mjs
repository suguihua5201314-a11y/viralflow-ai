import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadGenerationModules() {
  const assetsSource = await read("app/image-assets.ts");
  const assetsJavascript = ts.transpileModule(assetsSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const assetsUrl = `data:text/javascript;base64,${Buffer.from(assetsJavascript).toString("base64")}`;
  const actionSource = (await read("app/image-generation-action.ts"))
    .replace('from "./image-assets"', `from "${assetsUrl}"`);
  const actionJavascript = ts.transpileModule(actionSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return {
    assets: await import(assetsUrl),
    action: await import(`data:text/javascript;base64,${Buffer.from(actionJavascript).toString("base64")}`),
  };
}

async function reloadAssetsModule() {
  const assetsSource = await read("app/image-assets.ts");
  const assetsJavascript = ts.transpileModule(assetsSource, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const nonce = Math.random().toString(36).slice(2);
  return import(`data:text/javascript;base64,${Buffer.from(assetsJavascript).toString("base64")}#${nonce}`);
}

const request = {
  projectId: "project-a",
  prompt: "同一人物手持产品，稳定自然光",
  imageType: "Product Image",
  style: "Realistic",
  camera: "Close Up",
  ratio: "9:16",
  model: "doubao-image",
};

function reference(frameType, shotId = "shot-02") {
  return {
    type: "frame-prompt",
    projectId: "project-a",
    scriptIdentity: "script:101",
    scriptVersion: "Script V1",
    shotId,
    sourceBlockId: "scene-2",
    frameType,
    promptType: frameType,
  };
}

test("Phase 5.5A: shared action persists complete references and keeps history", async () => {
  const storage = new Map();
  globalThis.window = {};
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  let sequence = 0;
  globalThis.fetch = async () => {
    sequence += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        image: {
          provider: "doubao-image",
          model: "seedream",
          imageUrl: `https://example.com/generated-${sequence}.png`,
          createdAt: `2026-09-23T0${sequence}:00:00.000Z`,
          metadata: { size: "1024x1792", requestId: `request-${sequence}` },
        },
      }),
    };
  };

  const { action, assets } = await loadGenerationModules();
  const start = await action.generateAndSaveImage({ request, sourceReference: reference("start-frame"), assetIdPrefix: "start-frame" });
  const end = await action.generateAndSaveImage({ request, sourceReference: reference("end-frame"), assetIdPrefix: "end-frame" });
  const history = assets.readImageAssets();

  assert.equal(start.persisted, true);
  assert.equal(end.persisted, true);
  assert.equal(history.length, 2);
  assert.equal(history[0].metadata.sourceReference.frameType, "end-frame");
  assert.equal(history[1].metadata.sourceReference.frameType, "start-frame");
  assert.equal(history[1].metadata.sourceReference.projectId, "project-a");
  assert.equal(history[1].metadata.sourceReference.scriptIdentity, "script:101");
  assert.equal(history[1].metadata.sourceReference.shotId, "shot-02");
});

test("Phase 5.5A regression: reload rehydrates newest frame without crossing shot or frame", async () => {
  const storage = new Map();
  globalThis.window = {};
  globalThis.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  let sequence = 0;
  globalThis.fetch = async () => {
    sequence += 1;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        image: {
          provider: "doubao-image",
          model: "seedream",
          imageUrl: `https://example.com/reload-${sequence}.png`,
          createdAt: `2026-09-23T0${sequence}:00:00.000Z`,
          metadata: { size: "1024x1792", requestId: `reload-${sequence}` },
        },
      }),
    };
  };

  const { action } = await loadGenerationModules();
  const stableReference = {
    ...reference("start-frame", "shot-01"),
    scriptIdentity: "director:stable-revision",
  };
  await action.generateAndSaveImage({ request, sourceReference: stableReference });
  await action.generateAndSaveImage({ request, sourceReference: stableReference });

  const rehydrated = await reloadAssetsModule();
  const history = rehydrated.readImageAssets();
  const frameQuery = {
    projectId: "project-a",
    scriptIdentity: "director:stable-revision",
    scriptVersion: "Script V1",
    shotId: "shot-01",
    frameType: "start-frame",
  };
  assert.equal(history.length, 2);
  assert.equal(rehydrated.newestFrameAsset(history, frameQuery)?.imageUrl, "https://example.com/reload-2.png");
  assert.equal(rehydrated.newestFrameAsset(history, { ...frameQuery, shotId: "shot-02" }), undefined);
  assert.equal(rehydrated.newestFrameAsset(history, { ...frameQuery, frameType: "end-frame" }), undefined);
});

test("Phase 5.5A: shared action preserves provider errors and normalizes network errors", async () => {
  globalThis.window = {};
  globalThis.localStorage = { getItem: () => null, setItem: () => {} };
  const { action } = await loadGenerationModules();

  globalThis.fetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { type: "rate_limit", message: "请求过于频繁，请稍后重试。", retryable: true } }),
  });
  await assert.rejects(
    action.generateAndSaveImage({ request, sourceReference: reference("start-frame") }),
    (error) => error.category === "rate_limit" && error.retryable === true && error.message === "请求过于频繁，请稍后重试。",
  );

  globalThis.fetch = async () => { throw new TypeError("offline"); };
  await assert.rejects(
    action.generateAndSaveImage({ request, sourceReference: reference("end-frame") }),
    (error) => error.category === "provider_error" && error.retryable === true && /无法连接图片生成服务/.test(error.message),
  );
});

test("Phase 5.5A: Visual generation captures identity and isolates frame state", async () => {
  const [workspace, card] = await Promise.all([
    read("app/frame-prompt-workspace.tsx"),
    read("app/components/frame-prompt/frame-card.tsx"),
  ]);
  for (const captured of ["targetProjectId", "targetShot", "targetScriptIdentity", "targetScriptVersion"])
    assert.match(workspace, new RegExp(`const ${captured}`));
  assert.match(workspace, /stateKey = imageRequestIdentityKey\(\{ projectId: targetProjectId, scriptIdentity: targetScriptIdentity, shotId: targetShot\.shotId, frameType \}\)/);
  assert.match(workspace, /director:\$\{directorContextId\}/);
  assert.match(workspace, /frameType: "start-frame"/);
  assert.match(workspace, /frameType: "end-frame"/);
  assert.match(workspace, /generateFrame\(prompts\.startFramePrompt, "start-frame"\)/);
  assert.match(workspace, /generateFrame\(prompts\.endFramePrompt, "end-frame"\)/);
  assert.match(card, /generating \? "生成中…"/);
  assert.doesNotMatch(card, />Generate|>Regenerate|>Error/);
});

test("Phase 5.5A: existing callers share one action and no second store", async () => {
  const [projectWorkspace, director, action, assets, memory] = await Promise.all([
    read("app/project-asset-workspace.tsx"),
    read("app/director-shot-image.tsx"),
    read("app/image-generation-action.ts"),
    read("app/image-assets.ts"),
    read("app/project-memory.ts"),
  ]);
  assert.match(projectWorkspace, /generateAndSaveImage/);
  assert.match(director, /generateAndSaveImage/);
  assert.match(action, /readImageAssets/);
  assert.match(action, /saveImageAssets/);
  assert.match(assets, /viralflow-image-assets-v1/);
  assert.doesNotMatch(projectWorkspace + director + action, /viralflow-image-assets-v2|generation-store|shot-image-store/i);
  assert.doesNotMatch(memory, /imageAssets|shotImages|generationStore/i);
});
