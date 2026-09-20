import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const page=read("../app/page.tsx");
const studio=read("../app/script-studio.tsx");
const sidebar=read("../app/components/layout/sidebar.tsx");
const recovery=read("../app/script-workspace.ts");
const css=read("../app/styles/workspace-components.css");

test("Script and Director share project navigation without changing Director workspace",()=>{
  assert.match(sidebar,/active==="director"\|\|active==="create"/);
  for(const label of ["脚本创作","爆款研究","内容策划","AI分镜导演","视觉创作","声音制作","素材管理","项目大脑"]) assert.ok(sidebar.includes(`label:"${label}"`));
  assert.match(page,/const projectMode=active==="brain"\|\|active==="director"\|\|active==="create"/);
});

test("Script is workspace-first with version rail, block canvas and assistant",()=>{
  assert.match(studio,/className="os-script-version-rail"/);
  assert.match(studio,/className="os-script-blocks"/);
  assert.match(studio,/className="os-script-assistant"/);
  assert.match(studio,/创意检查器/);
  assert.match(studio,/ScriptDocument script=\{draftScript\}/);
  assert.match(css,/\.creative-script-layout \{\s*grid-template-columns: minmax\(0, 1\.95fr\) minmax\(300px, 1fr\)/);
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
  assert.match(studio,/className="os-script-context-strip"/);
  assert.match(css,/\.creative-script-document/);
  assert.match(css,/\.creative-shot-timeline/);
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
  assert.match(css,/\.os-script-version-rail > div \{ display: flex/);
  assert.match(css,/\.os-version-select \{ display: grid/);
  assert.doesNotMatch(studio,/className="empty" key=\{`empty-v/);
  assert.match(studio,/os-version-slot-generate/);
});
