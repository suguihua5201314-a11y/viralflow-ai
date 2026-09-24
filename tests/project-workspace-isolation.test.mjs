import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadModules() {
  const [memorySource, scriptSource, foundationSource] = await Promise.all([
    read("app/project-memory.ts"), read("app/script-workspace.ts"), read("app/script-foundation.ts"),
  ]);
  const options = { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } };
  const load = (source, require = () => ({})) => {
    const output = ts.transpileModule(source, options).outputText;
    const module = { exports: {} };
    new Function("module", "exports", "require", output)(module, module.exports, require);
    return module.exports;
  };
  const memory = load(memorySource);
  const foundation = load(foundationSource);
  const scripts = load(scriptSource, (path) => path === "./project-memory" ? memory : path === "./script-foundation" ? foundation : {});
  return { memory, scripts };
}

const script = (revisionId, product) => ({ revisionId, title: revisionId, product, language: "", country: "", narration: revisionId });
const project = (id, product, revisions = []) => ({
  id, name: id, product, market: id === "a" ? "Spain" : "France", platform: "TikTok", language: id === "a" ? "Spanish" : "French", stage: "脚本",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", assets: { scriptVersions: revisions },
});
const workspaceA = {
  form: { product: "Screen Protector", country: "Spain", language: "Spanish", sellingPoints: "privacy", audience: "iPhone users", offer: "A offer", duration: "25", style: "UGC", framework: "AIDA" },
  selectedScriptRevisionId: "script-a2", referenceScript: "Ref A", directorContext: { duration: 25, offer: "A offer", sourceType: "script-studio" },
};
const workspaceB = {
  form: { product: "Mascara", country: "France", language: "French", sellingPoints: "volume", audience: "Beauty users", offer: "B offer", duration: "18", style: "Beauty demo", framework: "PAS" },
  selectedScriptRevisionId: "script-b1", referenceScript: "Ref B", directorContext: { duration: 18, offer: "B offer", sourceType: "viral-replication" },
};
const baseMemory = () => ({
  version: 1,
  projects: [project("a", "Screen Protector", [script("script-a1", "Screen Protector"), script("script-a2", "Screen Protector")]), project("b", "Mascara", [script("script-b1", "Mascara"), script("script-b3", "Mascara")])],
  workspace: { activeView: "create", currentProjectId: "a", workspaceByProject: { a: workspaceA, b: workspaceB } },
  memoryRevision: 4, writerId: "writer", updatedAt: "2026-01-01T00:00:00.000Z",
});

test("A → B → A and B → A → B restore every project-owned workspace field", async () => {
  const { memory } = await loadModules();
  const value = baseMemory();
  for (const id of ["a", "b", "a", "b"]) {
    const expected = id === "a" ? workspaceA : workspaceB;
    const restored = memory.resolveProjectWorkspace(value, id);
    assert.deepEqual(restored.form, expected.form);
    assert.equal(restored.selectedScriptRevisionId, expected.selectedScriptRevisionId);
    assert.equal(restored.referenceScript, expected.referenceScript);
    assert.deepEqual(restored.directorContext, expected.directorContext);
  }
});

test("an empty Project B never inherits Project A reference, form extras, or Director context", async () => {
  const { memory } = await loadModules();
  const value = baseMemory();
  delete value.workspace.workspaceByProject.b;
  assert.deepEqual(memory.resolveProjectWorkspace(value, "b"), {});
  assert.equal(memory.resolveProjectWorkspace(value, "b").referenceScript, undefined);
});

test("selected Script revision is scoped and foreign revision IDs safely fall back to the target canonical versions", async () => {
  const { memory, scripts } = await loadModules();
  const value = baseMemory();
  assert.equal(scripts.restoreProjectScriptState(value.projects[0], memory.resolveProjectWorkspace(value, "a")).currentScript.revisionId, "script-a2");
  assert.equal(scripts.restoreProjectScriptState(value.projects[1], memory.resolveProjectWorkspace(value, "b")).currentScript.revisionId, "script-b1");
  const foreign = memory.updateProjectWorkspace(value, "b", { selectedScriptRevisionId: "script-a2" });
  assert.equal(scripts.restoreProjectScriptState(foreign.projects[1], memory.resolveProjectWorkspace(foreign, "b")).currentScript.revisionId, "script-b3");
});

test("serialize, normalize, hydrate and repeat switching retain both Project workspaces", async () => {
  const { memory } = await loadModules();
  const restored = memory.normalizeProjectMemory(JSON.parse(JSON.stringify(baseMemory())));
  assert.equal(restored.workspace.currentProjectId, "a");
  assert.equal(memory.resolveProjectWorkspace(restored, "a").referenceScript, "Ref A");
  assert.equal(memory.resolveProjectWorkspace(restored, "b").referenceScript, "Ref B");
  assert.equal(memory.resolveProjectWorkspace(restored, "a").form.audience, "iPhone users");
});

test("legacy global workspace belongs only to its legacy currentProjectId", async () => {
  const { memory, scripts } = await loadModules();
  const value = baseMemory();
  delete value.workspace.workspaceByProject;
  value.workspace.form = workspaceA.form;
  value.workspace.currentScript = value.projects[0].assets.scriptVersions[1];
  value.workspace.referenceScript = "Legacy Ref A";
  value.workspace.directorContext = workspaceA.directorContext;
  const a = memory.resolveProjectWorkspace(value, "a"), b = memory.resolveProjectWorkspace(value, "b");
  assert.equal(a.selectedScriptRevisionId, "script-a2");
  assert.equal(scripts.restoreProjectScriptState(value.projects[0], a).currentScript.revisionId, "script-a2");
  assert.deepEqual(b, {});
});

test("create, duplicate and delete helpers keep workspace identities independent", async () => {
  const { memory } = await loadModules();
  const value = baseMemory();
  const created = memory.updateProjectWorkspace(value, "c", { form: { product: "New Product" }, referenceScript: "" });
  assert.equal(memory.resolveProjectWorkspace(created, "c").form.audience, undefined);
  const duplicated = memory.cloneProjectWorkspace(created, "a", "a-copy");
  duplicated.workspace.workspaceByProject["a-copy"].form.audience = "Copy audience";
  assert.equal(memory.resolveProjectWorkspace(duplicated, "a").form.audience, "iPhone users");
  const deleted = memory.removeProjectWorkspace(duplicated, "b");
  assert.equal(deleted.workspace.workspaceByProject.b, undefined);
  assert.equal(memory.resolveProjectWorkspace(deleted, "a").referenceScript, "Ref A");
  assert.equal(memory.resolveProjectWorkspace(deleted, "c").form.product, "New Product");
});

test("workspace mutations use one persistence revision while same-value writes do not bump", async () => {
  const { memory } = await loadModules();
  const value = baseMemory();
  const changed = memory.mutateProjectMemory(value, "writer-2", current => memory.updateProjectWorkspace(current, "a", { referenceScript: "Ref A2" }), "2026-02-01T00:00:00.000Z");
  assert.equal(changed.memoryRevision, 5);
  const same = memory.mutateProjectMemory(changed, "writer-2", current => memory.updateProjectWorkspace(current, "a", { referenceScript: "Ref A2" }));
  assert.equal(same, changed);
});

test("page projects React state from workspaceByProject and routes writes through mutateProjectMemory", async () => {
  const page = await read("app/page.tsx");
  assert.match(page, /restoreProjectProjection\(projectMemory,projectMemory\.workspace\.currentProjectId\)/);
  assert.match(page, /setReferenceScript\(workspace\.referenceScript\|\|""\)/);
  assert.match(page, /setDirectorSourceType\(\(workspace\.directorContext\?\.sourceType/);
  assert.match(page, /setProjectMemory\(current=>mutateProjectMemory/);
  assert.match(page, /removeProjectWorkspace/);
  assert.doesNotMatch(page, /setForm\(previous=>\(\{\.\.\.previous,product:project\.product/);
});
