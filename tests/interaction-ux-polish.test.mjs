import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(new URL(path,import.meta.url),"utf8");
const state=read("../app/components/ui/workspace-state.tsx");
const css=read("../app/styles/interaction.css");
const script=read("../app/script-studio.tsx");
const analyzer=read("../app/viral-analyzer.tsx");
const replication=read("../app/viral-replication.tsx");
const director=read("../app/shooting-director.tsx");
const voice=read("../app/voice-studio.tsx");
const sidebar=read("../app/components/layout/sidebar.tsx");
const header=read("../app/components/layout/top-header.tsx");
const project=read("../app/project-workspace.tsx");
const page=read("../app/page.tsx");

test("Test A: primary AI buttons expose real loading states",()=>{
  for(const source of [script,analyzer,replication,director,voice])assert.match(source,/aria-busy=/);
  assert.match(css,/button\[aria-busy="true"\]/);
  assert.match(css,/\.button-spinner/);
});

test("Test B: AI processing feedback is honest and context-specific",()=>{
  assert.match(state,/steps\?: string\[\]/);
  assert.match(state,/index===0\?"处理中":"等待"/);
  for(const source of [script,analyzer,director,voice])assert.match(source,/steps=\{\[/);
  assert.match(replication,/正在迁移爆款机制/);
});

test("Test C: navigation active state is accessible and visible",()=>{
  assert.match(sidebar,/aria-current=\{active === item\.id \? "page"/);
  assert.match(sidebar,/className=\{active === item\.id \? "nav-active"/);
  assert.match(css,/nav button\.nav-active:after/);
});

test("Test D: tabs share hover and active state treatment",()=>{
  for(const selector of [".version-tabs button",".studio-segments button",".provider-tabs button",".va-toggle button",".vr-modes button",".projects-toolbar button"])assert.ok(css.includes(selector));
  assert.match(css,/button\.selected/);
});

test("Test E: actionable cards use restrained elevation",()=>{
  assert.match(css,/--vf-interaction-lift:translateY\(-2px\)/);
  assert.match(css,/\.project-card-grid>article:hover/);
  assert.match(css,/\.race-cards>article:hover/);
  assert.match(css,/prefers-reduced-motion/);
});

test("Test F: empty states keep actionable recovery paths",()=>{
  assert.match(project,/还没有项目/);
  assert.match(analyzer,/还没有爆款分析/);
  assert.match(script,/开始创建第一条短视频脚本/);
  assert.match(director,/选择一个脚本开始导演规划/);
  assert.match(voice,/还没有输入口播文案/);
});

test("Test G: save lifecycle is shared by header and Project Memory",()=>{
  assert.match(header,/saveState: "saved"\|"saving"/);
  assert.match(header,/正在保存\.\.\./);
  assert.match(header,/已保存 ✓/);
  assert.match(page,/setMemorySaveState\("saving"\)/);
  assert.match(page,/setMemorySaveState\("saved"\)/);
});

test("Test H: disabled actions explain why",()=>{
  assert.match(script,/当前 Provider 未配置/);
  assert.match(replication,/还没有复刻来源/);
  assert.match(voice,/GPT API 尚未配置/);
  assert.match(voice,/配置模型 · 未配置 API/);
});

test("Test I: architecture and persistence regression guards remain intact",()=>{
  assert.match(page,/viralflow-project-memory-v1|readProjectMemory\(\)/);
  assert.match(page,/cacheProjectMemory\(projectMemory\)/);
  assert.doesNotMatch(css,/background:\s*(?:#fff|white)/i);
  assert.match(read("../app/layout.tsx"),/typography\.css";\s*import "\.\/styles\/interaction\.css"/);
});
