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

test("Version Rail always builds five slots and fills only real versions",()=>{
  assert.match(studio,/Array\.from\(\{length:5\}/);
  assert.match(studio,/item:props\.raceResults\[index\]\?\?null/);
  assert.match(studio,/versionSlots\.map\(\(\{item,index,direction\}\)/);
  assert.match(studio,/if\(item\)\{const itemScore=props\.scoreScript\(item\)/);
  assert.match(studio,/key=\{`empty-v\$\{index\+1\}`\}/);
  assert.match(studio,/>待生成<\/span>/);
  assert.match(studio,/"生成此版本"/);
});

test("Version Rail keeps real identity, score and active state without fabricating empty content",()=>{
  assert.match(studio,/variantIdentity\(script\)===variantIdentity\(item\)/);
  assert.match(studio,/item\.style\|\|item\.hookType\|\|direction/);
  assert.match(studio,/\{item\.hook\}/);
  assert.match(studio,/\{itemScore\.total\}/);
  const emptyBranch=studio.slice(studio.indexOf('return <article className="version-empty"'),studio.indexOf("</section>",studio.indexOf('return <article className="version-empty"')));
  assert.doesNotMatch(emptyBranch,/itemScore|item\.hook/);
});

test("Version Rail remains compact with explicit empty slot styling",()=>{
  assert.match(css,/\.script-version-rail>header\{height:34px/);
  assert.match(css,/\.version-select\{height:58px/);
  assert.match(css,/article\.version-empty[^}]+border-style:dashed/);
  assert.doesNotMatch(studio,/className="empty" key=\{`empty-v/);
  assert.match(css,/\.version-slot-generate\{/);
});
