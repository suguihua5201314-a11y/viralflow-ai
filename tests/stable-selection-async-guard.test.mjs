import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadContexts() {
  const [source, memorySource] = await Promise.all([read("app/director-contexts.ts"), read("app/project-memory.ts")]);
  const options = { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } };
  const load = (value, require = () => ({})) => {
    const module = { exports: {} };
    new Function("module", "exports", "require", ts.transpileModule(value, options).outputText)(module, module.exports, require);
    return module.exports;
  };
  const memory = load(memorySource);
  return load(source, path => path === "./project-memory" ? memory : path === "./director-core" ? { directorContextId: request => request.contextId } : {});
}

async function loadImages() {
  const source = await read("app/image-assets.ts");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const workspace = (contextId, shotIds, selectedShot = 0, selectedShotIdentity) => ({
  result: { metadata: { contextId, sourceScriptRevisionId: `revision-${contextId}` } },
  shots: shotIds.map(shotId => ({ shotId })),
  selectedShot,
  selectedShotIdentity,
});

test("Context A shot-03 selection is not inherited by Context B even when B also has shot-03", async () => {
  const api = await loadContexts();
  const restored = api.stabilizeDirectorShotSelection(workspace("B", ["shot-01", "shot-02", "shot-03"], 2, { directorContextId: "A", shotId: "shot-03" }));
  assert.equal(restored.selectedShot, 0);
  assert.deepEqual(restored.selectedShotIdentity, { directorContextId: "B", shotId: "shot-01" });
});

test("Shot reorder keeps the selected shot by stable shotId", async () => {
  const api = await loadContexts();
  const restored = api.stabilizeDirectorShotSelection(workspace("A", ["shot-03", "shot-01", "shot-02"], 2, { directorContextId: "A", shotId: "shot-03" }));
  assert.equal(restored.selectedShot, 0);
  assert.equal(restored.shots[restored.selectedShot].shotId, "shot-03");
});

test("Deleting the selected shot chooses a valid neighbor and replaces the stale identity", async () => {
  const api = await loadContexts();
  const restored = api.stabilizeDirectorShotSelection(workspace("A", ["shot-01", "shot-03"], 1, { directorContextId: "A", shotId: "shot-02" }));
  assert.equal(restored.selectedShot, 1);
  assert.deepEqual(restored.selectedShotIdentity, { directorContextId: "A", shotId: "shot-03" });
});

test("Empty shot collection has null stable selection", async () => {
  const api = await loadContexts();
  const restored = api.stabilizeDirectorShotSelection(workspace("A", [], 2, { directorContextId: "A", shotId: "shot-03" }));
  assert.equal(restored.selectedShot, null);
  assert.equal(restored.selectedShotIdentity, null);
});

test("A to B to A restores each context-owned shot identity", async () => {
  const api = await loadContexts();
  const a = api.stabilizeDirectorShotSelection(workspace("A", ["shot-01", "shot-03"], 0, { directorContextId: "A", shotId: "shot-03" }));
  const b = api.stabilizeDirectorShotSelection(workspace("B", ["shot-01", "shot-03"], 0, { directorContextId: "B", shotId: "shot-01" }));
  assert.equal(a.shots[a.selectedShot].shotId, "shot-03");
  assert.equal(b.shots[b.selectedShot].shotId, "shot-01");
  assert.equal(api.stabilizeDirectorShotSelection(a).shots[a.selectedShot].shotId, "shot-03");
});

test("image request identity isolates Project, Director context, Shot and frame type", async () => {
  const api = await loadImages();
  const base = { projectId: "project-a", scriptIdentity: "director:c1", shotId: "shot-01", frameType: "start-frame" };
  assert.equal(api.sameImageRequestIdentity(base, { ...base }), true);
  assert.equal(api.sameImageRequestIdentity(base, { ...base, projectId: "project-b" }), false);
  assert.equal(api.sameImageRequestIdentity(base, { ...base, scriptIdentity: "director:c2" }), false);
  assert.equal(api.sameImageRequestIdentity(base, { ...base, shotId: "shot-02" }), false);
  assert.equal(api.sameImageRequestIdentity(base, { ...base, frameType: "end-frame" }), false);
});

test("Director async completion separates canonical save from active UI mutation", async () => {
  const api = await loadContexts();
  const a = { projectId: "p", scriptRevisionId: "r1", contextId: "c1" };
  const b = { projectId: "p", scriptRevisionId: "r2", contextId: "c2" };
  assert.equal(api.sameDirectorRequestIdentity(a, b), false);
  assert.equal(api.sameDirectorRequestIdentity(a, { ...a }), true);
});

test("production async paths guard stale success, error and loading state", async () => {
  const [director, frames, images, page, analyzer, replication] = await Promise.all([
    read("app/shooting-director.tsx"), read("app/frame-prompt-workspace.tsx"), read("app/project-asset-workspace.tsx"), read("app/page.tsx"), read("app/viral-analyzer.tsx"), read("app/viral-replication.tsx"),
  ]);
  assert.match(director, /requestIdentity\.current !== requestedIdentity/);
  assert.match(director, /requestIdentity\.current === requestedIdentity/);
  assert.match(frames, /imageRequestIdentityKey/);
  assert.match(frames, /\[stateKey\]: \{ status: "error"/);
  assert.match(images, /activeGenerationIdentity\.current !== requestedIdentity/);
  assert.match(images, /activeGenerationIdentity\.current === requestedIdentity/);
  assert.match(page, /activeScriptGenerationIdentity\.current!==requestedIdentity/);
  assert.match(page, /persistScriptsForProject\(requestedProjectId/);
  assert.match(analyzer, /activeProjectId\.current!==requestedProjectId/);
  assert.match(replication, /activeProjectId\.current!==requestedProjectId/);
});
