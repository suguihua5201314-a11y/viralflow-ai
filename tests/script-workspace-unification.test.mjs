import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const page=read("../app/page.tsx");
const studio=read("../app/script-studio.tsx");
const sidebar=read("../app/components/layout/sidebar.tsx");
const recovery=read("../app/script-workspace.ts");
const css=read("../app/styles/script-workspace.css");

test("Script and Director share project navigation without changing Director workspace",()=>{
  assert.match(sidebar,/active==="director"\|\|active==="create"/);
  for(const label of ["Script","Analyzer","Replication","AI Director","Images","Voice","Assets","Memory"]) assert.ok(sidebar.includes(`label:"${label}"`));
  assert.match(page,/active==="create"\?"vf-project-mode vf-script-mode"/);
});

test("Script is workspace-first with version rail, block canvas and assistant",()=>{
  assert.match(studio,/className="script-version-rail"/);
  assert.match(studio,/className="script-blocks"/);
  assert.match(studio,/className="script-assistant"/);
  assert.match(studio,/Creative Controls/);
  assert.match(css,/\.vf-script-mode \.studio-brief,[^}]+display:none/);
  assert.match(css,/grid-template-columns:minmax\(640px,1fr\) 360px/);
});

test("sending to Director persists the current draft first",()=>{
  assert.match(studio,/props\.onDraftChange\(draftScript\);props\.onNavigate\("director"\)/);
  assert.match(studio,/onClick=\{sendToDirector\}/);
});

test("project recovery follows project-owned versions, scoped workspace, replication, empty order",()=>{
  const expressions=["workspaceScript||versions.at(-1)||replicationScript||null","versionIds.has(identity(snapshot.currentScript))","belongsToProject(script,project)"];
  for(const expression of expressions) assert.ok(recovery.includes(expression),expression);
  assert.match(page,/restoreProjectScriptState\(project,projectMemory\.workspace\)/);
  assert.doesNotMatch(page,/setResult\(projectMemory\.workspace\.currentScript as StudioScript\)/);
});

test("real project versions restore the version rail and dense editor content",()=>{
  assert.match(recovery,/restoredRaceResults\.length\?restoredRaceResults:versions/);
  assert.match(recovery,/new Map\(project\.assets\.scriptVersions/);
  assert.match(studio,/variantIdentity\(script\)===variantIdentity\(item\)/);
  assert.match(studio,/className="script-context-strip"/);
  assert.match(css,/height:58px/);
  assert.match(css,/\.pacing-card,[^}]+\.editor-status\{display:none\}/);
});
