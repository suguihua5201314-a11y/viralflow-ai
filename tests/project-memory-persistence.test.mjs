import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadMemory() {
  const source = await read("app/project-memory.ts");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function("module", "exports", output)(module, module.exports);
  return module.exports;
}

const memory = (id, revision, extra = {}) => ({
  version: 1,
  projects: [{ id, name: id, product: id, market: "", platform: "TikTok", language: "", stage: "脚本", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", assets: { scriptVersions: [] } }],
  workspace: { activeView: "create", currentProjectId: id },
  memoryRevision: revision,
  writerId: `writer-${id}`,
  updatedAt: `2026-01-${String(revision + 1).padStart(2, "0")}T00:00:00.000Z`,
  ...extra,
});

test("1-3 revision arbitration chooses the higher revision and equal content is deterministic", async () => {
  const api = await loadMemory();
  const local5 = memory("same", 5), remote3 = memory("remote", 3), local3 = memory("local", 3);
  assert.equal(api.resolveProjectMemoryState(local5, remote3, memory("initial", 0)).source, "local");
  assert.equal(api.resolveProjectMemoryState(local3, local5, memory("initial", 0)).source, "remote");
  const sameRemote = { ...local5, writerId: "other-writer", updatedAt: "2099-01-01T00:00:00.000Z" };
  const resolution = api.resolveProjectMemoryState(local5, sameRemote, memory("initial", 0));
  assert.equal(resolution.source, "remote");
  assert.equal(resolution.conflict, false);
});

test("4 equal revisions with different canonical content report conflict without silent remote overwrite", async () => {
  const api = await loadMemory();
  const local = memory("local", 5), remote = memory("remote", 5);
  const resolution = api.resolveProjectMemoryState(local, remote, memory("initial", 0));
  assert.equal(resolution.conflict, true);
  assert.equal(resolution.source, "local");
  assert.equal(resolution.memory.projects[0].id, "local");
  assert.equal(resolution.remoteRevision, 5);
});

test("5-7 unavailable sources preserve local, restore remote, or use initial", async () => {
  const api = await loadMemory();
  const local = memory("local", 2), remote = memory("remote", 4), initial = memory("initial", 0);
  assert.equal(api.resolveProjectMemoryState(local, null, initial).memory.projects[0].id, "local");
  assert.equal(api.resolveProjectMemoryState(null, remote, initial).memory.projects[0].id, "remote");
  assert.equal(api.resolveProjectMemoryState(null, null, initial).memory.projects[0].id, "initial");
});

test("8-9 legacy local and remote memories normalize safely to revision zero", async () => {
  const api = await loadMemory();
  const legacyLocal = memory("local", 0), legacyRemote = memory("remote", 0);
  delete legacyLocal.memoryRevision; delete legacyLocal.writerId;
  delete legacyRemote.memoryRevision; delete legacyRemote.writerId;
  assert.equal(api.resolveProjectMemoryState(legacyLocal, null, memory("initial", 0)).memory.memoryRevision, 0);
  assert.equal(api.resolveProjectMemoryState(null, legacyRemote, memory("initial", 0)).memory.writerId, "legacy/unknown");
});

test("10 persistence is blocked until ready and the hydrated object is never immediately written", async () => {
  const api = await loadMemory();
  const hydrated = memory("local", 2);
  assert.equal(api.shouldPersistProjectMemory("uninitialized", hydrated, null), false);
  assert.equal(api.shouldPersistProjectMemory("hydrating", hydrated, null), false);
  assert.equal(api.shouldPersistProjectMemory("ready", hydrated, hydrated), false);
  assert.equal(api.shouldPersistProjectMemory("ready", { ...hydrated }, hydrated), true);
});

test("11-12 stale writes and equal-revision divergent writes are rejected", async () => {
  const api = await loadMemory();
  const stored = memory("remote", 10);
  assert.equal(api.validateProjectMemoryWrite(stored, memory("incoming", 8), 10).status, "stale");
  const conflict = memory("other", 10, { writerId: "other-writer" });
  assert.equal(api.validateProjectMemoryWrite(stored, conflict, 10).status, "conflict");
});

test("13-14 canonical mutation increments exactly once while same-value and normalization do not", async () => {
  const api = await loadMemory();
  const original = memory("project", 7);
  const changed = api.mutateProjectMemory(original, "browser-writer", current => ({ ...current, workspace: { ...current.workspace, activeView: "director" } }), "2026-09-24T10:00:00.000Z");
  assert.equal(changed.memoryRevision, 8);
  assert.equal(changed.writerId, "browser-writer");
  assert.equal(changed.updatedAt, "2026-09-24T10:00:00.000Z");
  const same = api.mutateProjectMemory(changed, "browser-writer", current => current, "2026-09-24T11:00:00.000Z");
  assert.equal(same, changed);
  assert.equal(api.normalizeProjectMemory(changed).memoryRevision, 8);
});

test("15 client keeps the local canonical mutation when remote persistence fails", async () => {
  const [api, page] = await Promise.all([loadMemory(), read("app/page.tsx")]);
  const original = memory("project", 1);
  const local = api.mutateProjectMemory(original, "browser-writer", current => ({ ...current, workspace: { ...current.workspace, activeView: "frames" } }));
  await assert.rejects(Promise.reject(new Error("network unavailable")));
  assert.equal(local.memoryRevision, 2);
  assert.equal(local.workspace.activeView, "frames");
  assert.match(page, /cacheProjectMemory\(projectMemory\)[\s\S]*fetch\("\/api\/project-memory"/);
  assert.doesNotMatch(page, /catch\{[^}]*setProjectMemory/);
});

test("API route exposes expected revision, stale/conflict categories and a real server error", async () => {
  const route = await read("app/api/project-memory/route.ts");
  assert.match(route, /expectedRemoteRevision/);
  assert.match(route, /validateProjectMemoryWrite/);
  assert.match(route, /status === "invalid" \? 400 : 409/);
  assert.match(route, /status: 503/);
  assert.doesNotMatch(route, /persisted: false[^\n]+status: 202/);
});
