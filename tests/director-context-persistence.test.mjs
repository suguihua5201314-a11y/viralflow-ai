import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadModules() {
  const [coreSource, memorySource, contextsSource] = await Promise.all([
    read("app/director-core.ts"), read("app/project-memory.ts"), read("app/director-contexts.ts"),
  ]);
  const options = { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } };
  const load = (source, require = () => ({})) => {
    const output = ts.transpileModule(source, options).outputText;
    const module = { exports: {} };
    new Function("module", "exports", "require", output)(module, module.exports, require);
    return module.exports;
  };
  const core = load(coreSource, path => path === "./knowledge-context" ? { buildKnowledgeContext: () => ({}), findFactViolations: () => [] } : {});
  const memory = load(memorySource);
  const contexts = load(contextsSource, path => path === "./director-core" ? core : path === "./project-memory" ? memory : {});
  return { core, memory, contexts };
}

async function loadImageAssets() {
  const source = await read("app/image-assets.ts");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

const script = (revisionId, line = "Show product") => ({ revisionId, title: revisionId, product: "CrystalArmor", language: "Spanish", country: "Spain", hook: line, narration: line, scenes: [{ time: "0-3", visual: line, line, edit: "cut" }] });
const request = (projectId, revisionId, line = "Show product") => ({ projectId, scriptRevisionId: revisionId, script: script(revisionId, line), context: { product: "CrystalArmor", sellingPoints: "Privacy", audience: "iPhone users", market: "Spain", language: "Spanish", platform: "TikTok", targetDuration: 20, creativeMode: "UGC", hookStrategy: "Curiosity", framework: "AIDA", creativeAngle: "Proof", sourceType: "script-studio" } });
const project = id => ({ id, name: id, product: "CrystalArmor", market: "Spain", platform: "TikTok", language: "Spanish", stage: "脚本", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", assets: { scriptVersions: [] } });
const workspace = (core, req, marker) => ({ result: { directorPlan: { marker }, shots: [], metadata: { contextId: core.directorContextId(req), sourceScriptRevisionId: req.scriptRevisionId } }, shots: [{ shotId: "shot-01", marker }], selectedShot: 0 });

test("save A then B preserves both contexts and A/B restore by deterministic identity", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "a"), b = request("p", "b");
  let value = project("p");
  value = contexts.saveDirectorWorkspace(value, a, workspace(core, a, "A"), true);
  value = contexts.saveDirectorWorkspace(value, b, workspace(core, b, "B"), true);
  assert.equal(Object.keys(value.assets.directorContexts).length, 2);
  assert.equal(contexts.resolveDirectorWorkspace(value, a).shots[0].marker, "A");
  assert.equal(contexts.resolveDirectorWorkspace(value, b).shots[0].marker, "B");
});

test("same revision with edited content creates and restores separate contexts", async () => {
  const { core, contexts } = await loadModules();
  const first = request("p", "a", "content one"), edited = request("p", "a", "content two");
  assert.notEqual(core.directorContextId(first), core.directorContextId(edited));
  let value = contexts.saveDirectorWorkspace(project("p"), first, workspace(core, first, "C1"), true);
  value = contexts.saveDirectorWorkspace(value, edited, workspace(core, edited, "C2"), true);
  assert.equal(contexts.resolveDirectorWorkspace(value, first).shots[0].marker, "C1");
  assert.equal(contexts.resolveDirectorWorkspace(value, edited).shots[0].marker, "C2");
});

test("foreign revision and foreign project results are rejected", async () => {
  const { core, contexts } = await loadModules();
  const a = request("a", "a1"), foreignRevision = request("a", "a2"), foreignProject = request("b", "a1");
  const original = project("a"), result = workspace(core, a, "A");
  assert.equal(contexts.saveDirectorWorkspace(original, foreignRevision, result, true), original);
  assert.equal(contexts.saveDirectorWorkspace(original, foreignProject, result, true), original);
});

test("legacy result is readable only for its matching context without mutation", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "a"), value = project("p");
  value.assets.directorResult = workspace(core, a, "legacy");
  const before = JSON.stringify(value);
  assert.equal(contexts.resolveDirectorWorkspace(value, a).shots[0].marker, "legacy");
  assert.equal(JSON.stringify(value), before);
  assert.equal(value.assets.directorContexts, undefined);
});

test("a real mutation carries legacy forward while a stale completion does not change current mirror", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "a"), b = request("p", "b");
  let value = project("p");
  value.assets.directorResult = workspace(core, a, "legacy-A");
  value = contexts.saveDirectorWorkspace(value, b, workspace(core, b, "B"), true);
  const aId = core.directorContextId(a), bId = core.directorContextId(b);
  assert.equal(value.assets.directorContexts[aId].shots[0].marker, "legacy-A");
  assert.equal(value.assets.currentDirectorContextId, bId);
  const lateA = { ...workspace(core, a, "late-A"), selectedShot: 0 };
  value = contexts.saveDirectorWorkspace(value, a, lateA, false);
  assert.equal(value.assets.directorContexts[aId].shots[0].marker, "late-A");
  assert.equal(value.assets.currentDirectorContextId, bId);
  assert.equal(value.assets.directorResult.shots[0].marker, "B");
});

test("same-value save is referentially stable and one real mutation bumps Project Memory once", async () => {
  const { core, memory, contexts } = await loadModules();
  const req = request("p", "a"), initialProject = project("p"), saved = contexts.saveDirectorWorkspace(initialProject, req, workspace(core, req, "A"), true);
  assert.equal(contexts.saveDirectorWorkspace(saved, req, workspace(core, req, "A"), true), saved);
  const root = { version: 1, projects: [initialProject], workspace: { activeView: "director", currentProjectId: "p" }, memoryRevision: 7, writerId: "writer", updatedAt: "2026-01-01T00:00:00.000Z" };
  const changed = memory.mutateProjectMemory(root, "writer", current => ({ ...current, projects: [contexts.saveDirectorWorkspace(current.projects[0], req, workspace(core, req, "A"), true)] }));
  assert.equal(changed.memoryRevision, 8);
  const same = memory.mutateProjectMemory(changed, "writer", current => ({ ...current, projects: [contexts.saveDirectorWorkspace(current.projects[0], req, workspace(core, req, "A"), true)] }));
  assert.equal(same, changed);
});

test("invalid selected shot safely falls back inside the restored context", async () => {
  const { core, contexts } = await loadModules();
  const req = request("p", "a"), invalid = { ...workspace(core, req, "A"), selectedShot: 9 };
  const value = contexts.saveDirectorWorkspace(project("p"), req, invalid, true);
  assert.equal(contexts.resolveDirectorWorkspace(value, req).selectedShot, 0);
});

test("serialize and hydrate retains all contexts and current pointer", async () => {
  const { core, memory, contexts } = await loadModules();
  const a = request("p", "a"), b = request("p", "b");
  let value = contexts.saveDirectorWorkspace(project("p"), a, workspace(core, a, "A"), true);
  value = contexts.saveDirectorWorkspace(value, b, workspace(core, b, "B"), true);
  const root = memory.normalizeProjectMemory(JSON.parse(JSON.stringify({ version: 1, projects: [value], workspace: { activeView: "director", currentProjectId: "p" }, memoryRevision: 3, writerId: "writer", updatedAt: "2026-01-01T00:00:00.000Z" })));
  assert.equal(contexts.resolveDirectorWorkspace(root.projects[0], a).shots[0].marker, "A");
  assert.equal(contexts.resolveDirectorWorkspace(root.projects[0], b).shots[0].marker, "B");
  assert.equal(root.projects[0].assets.currentDirectorContextId, core.directorContextId(b));
});

test("activating an already saved context changes only the current pointer and mirror", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "a"), b = request("p", "b");
  let value = contexts.saveDirectorWorkspace(project("p"), a, workspace(core, a, "A"), true);
  value = contexts.saveDirectorWorkspace(value, b, workspace(core, b, "B"), true);
  const restoredA = contexts.resolveDirectorWorkspace(value, a);
  value = contexts.saveDirectorWorkspace(value, a, restoredA, true);
  assert.equal(value.assets.currentDirectorContextId, core.directorContextId(a));
  assert.equal(value.assets.directorResult.shots[0].marker, "A");
  assert.equal(value.assets.directorContexts[core.directorContextId(b)].shots[0].marker, "B");
});

test("request identity guard distinguishes async completion from the active Script", async () => {
  const { contexts } = await loadModules();
  const a = contexts.directorRequestIdentity("p", request("p", "a"));
  const b = contexts.directorRequestIdentity("p", request("p", "b"));
  assert.equal(contexts.sameDirectorRequestIdentity(a, a), true);
  assert.equal(contexts.sameDirectorRequestIdentity(a, b), false);
});

test("same shot ID in two Director contexts resolves only its own Frame/Image lineage", async () => {
  const { core } = await loadModules(), images = await loadImageAssets();
  const a = request("p", "a"), b = request("p", "b");
  const identityA = `director:${core.directorContextId(a)}`, identityB = `director:${core.directorContextId(b)}`;
  const asset = (id, scriptIdentity) => ({ id, projectId: "p", createdAt: "2026-01-01T00:00:00.000Z", metadata: { sourceReference: { type: "frame-prompt", projectId: "p", scriptIdentity, scriptVersion: "v", shotId: "shot-01", frameType: "start-frame" } } });
  const frameA = asset("frame-a", identityA), frameB = asset("frame-b", identityB);
  const query = scriptIdentity => ({ projectId: "p", scriptIdentity, scriptVersion: "v", shotId: "shot-01", frameType: "start-frame" });
  assert.equal(images.matchesFrameAsset(frameA, query(identityA)), true);
  assert.equal(images.matchesFrameAsset(frameB, query(identityA)), false);
  assert.equal(images.matchesFrameAsset(frameB, query(identityB)), true);
  assert.equal(images.matchesFrameAsset(frameA, query(identityB)), false);
});

test("return target A never copies foreign mirror B into a missing context", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "a"), b = request("p", "b");
  const resultB = workspace(core, b, "B");
  const value = project("p"), contextB = core.directorContextId(b), contextA = core.directorContextId(a);
  value.assets.directorContexts = { [contextB]: resultB };
  value.assets.currentDirectorContextId = contextB;
  value.assets.directorResult = resultB;
  const after = contexts.activateDirectorContext(value, { projectId: "p", contextId: contextA, scriptRevisionId: "a" }, { shotId: "shot-01" });
  assert.equal(after, value);
  assert.equal(after.assets.directorContexts[contextA], undefined);
  assert.equal(after.assets.currentDirectorContextId, contextB);
  assert.equal(after.assets.directorResult, resultB);
});

test("return target A accepts only an exact legacy A and carries it forward atomically", async () => {
  const { core, memory, contexts } = await loadModules();
  const a = request("p", "a"), resultA = workspace(core, a, "A"), contextA = core.directorContextId(a);
  const value = project("p");
  value.assets.directorResult = resultA;
  const root = { version: 1, projects: [value], workspace: { activeView: "images", currentProjectId: "p" }, memoryRevision: 4, writerId: "writer", updatedAt: "2026-01-01T00:00:00.000Z" };
  const after = memory.mutateProjectMemory(root, "writer", current => ({ ...current, projects: [contexts.activateDirectorContext(current.projects[0], { projectId: "p", contextId: contextA, scriptRevisionId: "a" }, { shotId: "shot-01" })] }));
  assert.equal(after.memoryRevision, 5);
  assert.equal(after.projects[0].assets.directorContexts[contextA].shots[0].marker, "A");
  assert.deepEqual(after.projects[0].assets.directorContexts[contextA].selectedShotIdentity, { directorContextId: contextA, shotId: "shot-01" });
  assert.equal(after.projects[0].assets.currentDirectorContextId, contextA);
  assert.equal(after.projects[0].assets.directorResult.shots[0].marker, "A");
});

test("existing collection A takes precedence over mirror B during return activation", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "a"), b = request("p", "b"), resultA = workspace(core, a, "A"), resultB = workspace(core, b, "B");
  const value = project("p"), contextA = core.directorContextId(a), contextB = core.directorContextId(b);
  value.assets.directorContexts = { [contextA]: resultA, [contextB]: resultB };
  value.assets.currentDirectorContextId = contextB;
  value.assets.directorResult = resultB;
  const after = contexts.activateDirectorContext(value, { projectId: "p", contextId: contextA, scriptRevisionId: "a" }, { shotId: "shot-01" });
  assert.equal(after.assets.currentDirectorContextId, contextA);
  assert.equal(after.assets.directorResult.shots[0].marker, "A");
  assert.equal(after.assets.directorContexts[contextA].shots[0].marker, "A");
});

test("return activation rejects a foreign source revision without any revision bump", async () => {
  const { core, memory, contexts } = await loadModules();
  const a = request("p", "a"), resultA = workspace(core, a, "A"), contextA = core.directorContextId(a);
  const value = project("p");
  value.assets.directorResult = resultA;
  const root = { version: 1, projects: [value], workspace: { activeView: "images", currentProjectId: "p" }, memoryRevision: 4, writerId: "writer", updatedAt: "2026-01-01T00:00:00.000Z" };
  const after = memory.mutateProjectMemory(root, "writer", current => ({ ...current, projects: [contexts.activateDirectorContext(current.projects[0], { projectId: "p", contextId: contextA, scriptRevisionId: "foreign" })] }));
  assert.equal(after, root);
  assert.equal(after.memoryRevision, 4);
  assert.equal(after.projects[0].assets.directorContexts, undefined);
});

test("activation rejects a foreign Project even when context and revision strings match", async () => {
  const { core, contexts } = await loadModules();
  const a = request("a", "r1"), resultA = workspace(core, a, "A"), contextA = core.directorContextId(a);
  const value = project("b");
  value.assets.directorContexts = { [contextA]: resultA };
  const after = contexts.activateDirectorContext(value, { projectId: "a", contextId: contextA, scriptRevisionId: "r1" });
  assert.equal(after, value);
  assert.equal(after.assets.currentDirectorContextId, undefined);
  assert.equal(after.assets.directorResult, undefined);
});

test("collection with the requested key but wrong revision is rejected", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "r2"), result = workspace(core, a, "wrong-revision"), contextA = core.directorContextId(request("p", "r1"));
  result.result.metadata.contextId = contextA;
  const value = project("p");
  value.assets.directorContexts = { [contextA]: result };
  const after = contexts.activateDirectorContext(value, { projectId: "p", contextId: contextA, scriptRevisionId: "r1" });
  assert.equal(after, value);
  assert.equal(after.assets.currentDirectorContextId, undefined);
});

test("legacy result without a verifiable Script revision is rejected", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "r1"), result = workspace(core, a, "legacy"), contextA = core.directorContextId(a);
  delete result.result.metadata.sourceScriptRevisionId;
  const value = project("p");
  value.assets.directorResult = result;
  const after = contexts.activateDirectorContext(value, { projectId: "p", contextId: contextA, scriptRevisionId: "r1" });
  assert.equal(after, value);
  assert.equal(after.assets.directorContexts, undefined);
});

test("same-value complete-identity activation is referentially stable", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "r1"), result = workspace(core, a, "A"), contextA = core.directorContextId(a);
  const value = project("p");
  value.assets.directorContexts = { [contextA]: result };
  value.assets.currentDirectorContextId = contextA;
  value.assets.directorResult = result;
  const stable = contexts.activateDirectorContext(value, { projectId: "p", contextId: contextA, scriptRevisionId: "r1" });
  assert.equal(contexts.activateDirectorContext(stable, { projectId: "p", contextId: contextA, scriptRevisionId: "r1" }), stable);
});

test("return-style full identity succeeds only for a verifiable exact lineage", async () => {
  const { core, contexts } = await loadModules();
  const a = request("p", "r1"), b = request("p", "r2"), resultA = workspace(core, a, "A"), resultB = workspace(core, b, "B");
  const contextA = core.directorContextId(a), contextB = core.directorContextId(b), value = project("p");
  value.assets.directorContexts = { [contextA]: resultA, [contextB]: resultB };
  value.assets.currentDirectorContextId = contextB;
  value.assets.directorResult = resultB;
  const identity = { projectId: "p", contextId: contextA, scriptRevisionId: "r1" };
  const after = contexts.activateDirectorContext(value, identity, { shotId: "shot-01" });
  assert.equal(after.assets.currentDirectorContextId, contextA);
  assert.equal(after.assets.directorResult.shots[0].marker, "A");

  assert.equal(contexts.activateDirectorContext(value, { ...identity, contextId: "missing-context" }), value);
  assert.equal(contexts.activateDirectorContext(value, { projectId: "p", contextId: contextA, scriptRevisionId: "foreign" }), value);
});
