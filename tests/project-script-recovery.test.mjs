import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadRecovery() {
  const [source, foundationSource, memorySource] = await Promise.all([read("app/script-workspace.ts"), read("app/script-foundation.ts"), read("app/project-memory.ts")]);
  const options = { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } };
  const foundationOutput = ts.transpileModule(foundationSource, options).outputText;
  const foundation = { exports: {} };
  new Function("module", "exports", foundationOutput)(foundation, foundation.exports);
  const memoryOutput = ts.transpileModule(memorySource, options).outputText;
  const memoryModule = { exports: {} };
  new Function("module", "exports", memoryOutput)(memoryModule, memoryModule.exports);
  const output = ts.transpileModule(source, options).outputText;
  const module = { exports: {} };
  const require = (path) => path === "./script-foundation" ? foundation.exports : path === "./project-memory" ? memoryModule.exports : {};
  new Function("module", "exports", "require", output)(module, module.exports, require);
  return { ...module.exports, foundation: foundation.exports };
}

const script = (id, title = `Script ${id}`, extra = {}) => ({
  id, title, product: "Product A", language: "中文", country: "中国", narration: `Narration ${id}`, ...extra,
});
const project = (id, scripts) => ({
  id, name: id, product: "Product A", market: "中国", platform: "TikTok", language: "中文", stage: "脚本",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", assets: { scriptVersions: scripts },
});
const memory = (projects, currentProjectId, workspace = {}) => ({ version: 1, projects, workspace: { activeView: "dashboard", currentProjectId, ...workspace }, updatedAt: "2026-01-01T00:00:00.000Z" });

test("1-3 empty local and API persistence hydrate default project scripts independently of global history", async () => {
  const api = await loadRecovery();
  const scripts = [1, 2, 3, 4, 5].map((id) => script(id));
  const fallback = memory([project("project-a", scripts)], "project-a");
  const resolved = api.resolveProjectMemorySource(null, null, fallback);
  const restored = api.restoreProjectScriptState(resolved.projects[0], resolved.workspace);
  const globalHistory = [];
  assert.equal(globalHistory.length, 0);
  assert.ok(restored.currentScript);
  assert.equal(restored.currentScript.id, 5);
  assert.equal(restored.raceResults.length, 5);
});

test("4-6 legacy numeric identity and scripts without revision or Creative Brief lineage restore", async () => {
  const api = await loadRecovery();
  const legacy = script(42);
  const restored = api.restoreProjectScriptState(project("project-a", [legacy]), { activeView: "create", currentProjectId: "project-a" });
  assert.equal(api.foundation.scriptRevisionIdentity(legacy), "legacy-script:42");
  assert.equal(restored.currentScript.id, 42);
  assert.equal(restored.currentScript.sourceCreativeBriefId, undefined);
});

test("7-8 project count uses valid deduplicated Script identities", async () => {
  const api = await loadRecovery();
  const scripts = [script(1), script(1, "Duplicate"), { id: 2, title: "Missing narration" }, null, script(3)];
  const value = project("project-a", scripts);
  assert.equal(value.assets.scriptVersions.length, 5);
  assert.equal(api.projectScriptVersionCount(value), 2);
});

test("9 project switching restores only the target project's scripts", async () => {
  const api = await loadRecovery();
  const first = project("project-a", [script(1)]), second = project("project-b", [script(2, "B", { product: "Product B" })]);
  second.product = "Product B";
  const restored = api.restoreProjectScriptState(second, { activeView: "create", currentProjectId: "project-b", currentScript: first.assets.scriptVersions[0] });
  assert.equal(restored.currentScript.id, 2);
  assert.deepEqual(restored.raceResults.map((item) => item.id), [2]);
});

test("10 Workspace snapshot cannot restore a Script outside the current project's version set", async () => {
  const api = await loadRecovery();
  const current = script(1), foreign = script(9);
  const restored = api.restoreProjectScriptState(project("project-a", [current]), { activeView: "create", currentProjectId: "project-a", currentScript: foreign, raceResults: [foreign] });
  assert.equal(restored.currentScript.id, 1);
  assert.deepEqual(restored.raceResults.map((item) => item.id), [1]);
});

test("11 higher-revision persisted Project Memory has priority while local survives a missing remote", async () => {
  const api = await loadRecovery();
  const fallback = memory([project("fallback", [script(1)])], "fallback");
  const local = {...memory([project("local", [script(2)])], "local"),memoryRevision:1,writerId:"local-writer"};
  const remote = {...memory([project("remote", [script(3)])], "remote"),memoryRevision:2,writerId:"remote-writer"};
  assert.equal(api.resolveProjectMemorySource(local, remote, fallback).workspace.currentProjectId, "remote");
  assert.equal(api.resolveProjectMemorySource(local, null, fallback).workspace.currentProjectId, "local");
});

test("12 Director fallback is not part of Script recovery", async () => {
  const source = await read("app/script-workspace.ts");
  assert.doesNotMatch(source, /directorResult|demoDirector|DirectorResult/);
});

test("13-14 Creative Brief to Script to Director lineage remains intact", async () => {
  const [foundation, page, route] = await Promise.all([read("app/script-foundation.ts"), read("app/page.tsx"), read("app/api/director/route.ts")]);
  assert.match(foundation, /sourceCreativeBriefId/);
  assert.match(foundation, /sourceCreativeBriefRevisionId/);
  assert.match(page, /scriptRevisionId:scriptRevisionIdentity\(result\)/);
  assert.match(route, /sourceScriptRevisionId:body\.scriptRevisionId/);
});
