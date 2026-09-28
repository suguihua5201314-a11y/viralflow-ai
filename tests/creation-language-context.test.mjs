import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const language = await jiti.import("../app/creation-language-context.ts");
const memory = await jiti.import("../app/project-memory.ts");
const director = await jiti.import("../app/director-core.ts");
const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");

const legacyProject = (overrides = {}) => ({
  id: "project-a", name: "A", product: "Product A", market: "Spain", platform: "TikTok", language: "Spanish",
  stage: "脚本", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  assets: { scriptVersions: [{ revisionId: "script-a" }], creativeBriefRevisions: [{ id: "brief-a", revisionId: "brief-revision-a" }], currentCreativeBriefRevisionId: "brief-revision-a" },
  ...overrides,
});

const projectMemory = (projects = [legacyProject()]) => ({
  version: 1, projects, workspace: { activeView: "create", currentProjectId: projects[0]?.id || null },
  memoryRevision: 7, writerId: "writer-a", updatedAt: "2026-01-01T00:00:00.000Z",
});

const directorRequest = (targetLanguage) => ({
  projectId: "project-a", scriptRevisionId: "script-a",
  script: { revisionId: "script-a", title: "Script", hook: "Hook", narration: "Narration", product: "Product A", language: targetLanguage, scenes: [{ time: "0-3s", visual: "Visual", line: "Line", edit: "Cut" }] },
  context: { product: "Product A", sellingPoints: "Fact", audience: "Audience", market: "Spain", language: targetLanguage, platform: "TikTok", targetDuration: 30, creativeMode: "UGC", hookStrategy: "好奇", framework: "AIDA", creativeAngle: "Angle", sourceType: "script-studio" },
});

test("legacy language resolves to a Chinese workspace and unchanged target language", () => {
  assert.deepEqual(language.resolveCreationLanguageContext(legacyProject()), {
    workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok",
  });
});

test("explicit target language wins and missing workspace language defaults deterministically", () => {
  assert.deepEqual(language.resolveCreationLanguageContext(legacyProject({ targetLanguage: "es-ES" })), {
    workspaceLanguage: "zh-CN", targetLanguage: "es-ES", market: "Spain", platform: "TikTok",
  });
  assert.equal(language.resolveCreationLanguageContext({}).workspaceLanguage, "zh-CN");
});

test("new project writes explicit language fields while retaining the legacy runtime field", () => {
  assert.match(pageSource, /workspaceLanguage:DEFAULT_WORKSPACE_LANGUAGE,targetLanguage:input\.language,language:input\.language/);
});

test("hydration resolves language without mutating memory, revision, Script, or Brief identity", () => {
  const stored = projectMemory();
  const restored = memory.normalizeProjectMemory(JSON.parse(JSON.stringify(stored)));
  assert.equal(restored.memoryRevision, 7);
  assert.equal(JSON.stringify(restored.projects), JSON.stringify(stored.projects));
  assert.equal(restored.projects[0].assets.scriptVersions[0].revisionId, "script-a");
  assert.equal(restored.projects[0].assets.creativeBriefRevisions[0].revisionId, "brief-revision-a");
  assert.equal(language.resolveCreationLanguageContext(restored.projects[0]).targetLanguage, "Spanish");
  assert.equal(memory.shouldPersistProjectMemory("ready", restored, restored), false);
});

test("legacy Director Context identity is unchanged by resolved workspace language", () => {
  const project = legacyProject();
  const before = director.directorContextId(directorRequest(project.language));
  const resolved = language.resolveCreationLanguageContext(project);
  const after = director.directorContextId(directorRequest(resolved.targetLanguage));
  assert.equal(after, before);
});

test("Project language contexts remain isolated and target changes do not mutate canonical identities", () => {
  const projects = [legacyProject(), legacyProject({ id: "project-b", market: "France", language: "French", targetLanguage: "fr-FR" })];
  assert.equal(language.resolveCreationLanguageContext(projects[0]).targetLanguage, "Spanish");
  assert.equal(language.resolveCreationLanguageContext(projects[1]).targetLanguage, "fr-FR");
  const scriptRevisionId = projects[0].assets.scriptVersions[0].revisionId;
  const briefRevisionId = projects[0].assets.creativeBriefRevisions[0].revisionId;
  const changed = { ...projects[0], targetLanguage: "de-DE" };
  assert.equal(changed.assets.scriptVersions[0].revisionId, scriptRevisionId);
  assert.equal(changed.assets.creativeBriefRevisions[0].revisionId, briefRevisionId);
});

test("L1 leaves existing Provider payload language behavior unchanged", () => {
  assert.match(pageSource, /language:form\.language/);
  assert.doesNotMatch(pageSource, /workspaceLanguage:form\.language/);
});
