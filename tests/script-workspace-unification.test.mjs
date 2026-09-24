import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const page=read("../app/page.tsx");
const studio=read("../app/script-studio.tsx");
const sidebar=read("../app/components/layout/sidebar.tsx");
const workflow=read("../app/components/layout/workflow-step-bar.tsx");
const recovery=read("../app/script-workspace.ts");
const css=read("../app/styles/workspace-components.css");

test("Script and Director share product sidebar while workflow keeps project steps",()=>{
  assert.match(sidebar,/active : "projects"/);
  assert.match(page,/sidebar=\{<Sidebar active=\{active\}/);
  for(const id of ["create","director","frames","images"]) assert.ok(workflow.includes(`id: "${id}"`));
  assert.doesNotMatch(sidebar,/label: "脚本创作"|label: "AI分镜导演"|label: "画面提示词"/);
  assert.match(page,/const projectMode=active==="brain"\|\|active==="director"\|\|active==="frames"\|\|active==="create"/);
});

test("Script is workspace-first with version rail, block canvas and assistant",()=>{
  assert.match(studio,/className="os-script-version-rail"/);
  assert.match(studio,/blocks=\{blocks\}/);
  assert.match(studio,/className="os-script-assistant"/);
  assert.match(studio,/AI 创作助手/);
  assert.match(studio,/<ScriptDocument/);
  assert.match(css,/\.creative-script-layout \{\s*grid-template-columns: minmax\(0, 1\.95fr\) minmax\(300px, 1fr\)/);
});

test("sending to Director persists the current draft first",()=>{
  assert.match(studio,/props\.onDraftChange\(draftScript\);\s*props\.onNavigate\("director"\)/);
  assert.match(studio,/onDirector=\{sendToDirector\}/);
});

test("project recovery follows project-owned versions, scoped workspace, replication, empty order",()=>{
  const expressions=["selectedScript||workspaceScript||versions.at(-1)||replicationScript||null","versionIds.has(identity(legacyScript))","belongsToProject(legacyScript,project)"];
  for(const expression of expressions) assert.ok(recovery.includes(expression),expression);
  assert.match(page,/restoreProjectScriptState\(project,workspace\)/);
  assert.match(page,/resolveProjectWorkspace\(memory,projectId\)/);
  assert.doesNotMatch(page,/setResult\(projectMemory\.workspace\.currentScript as StudioScript\)/);
});

test("real project versions restore the version rail and dense editor content",()=>{
  assert.match(recovery,/restoredRaceResults\.length\?restoredRaceResults:versions/);
  assert.match(recovery,/new Map\(project\.assets\.scriptVersions/);
  assert.match(studio,/variantIdentity\(script\)\s*===\s*variantIdentity\(item\)/);
  assert.match(studio,/className="os-script-context-strip"/);
  assert.match(css,/\.creative-script-document/);
  assert.match(css,/\.creative-shot-timeline/);
});

test("Version Rail always builds five slots and fills only real versions",()=>{
  assert.match(studio,/Array\.from\(\{ length: 5 \}/);
  assert.match(studio,/item: props\.raceResults\[index\] \?\? null/);
  assert.match(studio,/versionSlots\.map\(\(\{ item, index, direction \}\)/);
  assert.match(studio,/if \(item\) \{\s*const itemScore = props\.scoreScript\(item\)/);
  assert.match(studio,/key=\{`empty-v\$\{index \+ 1\}`\}/);
  assert.match(studio,/>待生成<\/span>/);
  assert.match(studio,/"生成此版本"/);
});

test("Version Rail keeps real identity, score and active state without fabricating empty content",()=>{
  assert.match(studio,/variantIdentity\(script\)\s*===\s*variantIdentity\(item\)/);
  assert.match(studio,/item\.style \|\| item\.hookType \|\| direction/);
  assert.match(studio,/\{item\.hook\}/);
  assert.match(studio,/\{itemScore\.total\}/);
  const emptyBranch=studio.slice(studio.indexOf('return <article className="version-empty"'),studio.indexOf("</section>",studio.indexOf('return <article className="version-empty"')));
  assert.doesNotMatch(emptyBranch,/itemScore|item\.hook/);
});

test("Version Rail remains compact with explicit empty slot styling",()=>{
  assert.match(css,/\.os-script-version-rail > div \{ display: flex/);
  assert.match(css,/\.os-version-select \{ display: grid/);
  assert.doesNotMatch(studio,/className="empty" key=\{`empty-v/);
  assert.match(studio,/os-version-slot-generate/);
});
