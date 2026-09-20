import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css=readFileSync(new URL("../app/styles/workspace-components.css",import.meta.url),"utf8");
const tokens=readFileSync(new URL("../app/styles/design-tokens.css",import.meta.url),"utf8");
const layout=readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");
const voice=readFileSync(new URL("../app/voice-studio.tsx",import.meta.url),"utf8");
const replication=readFileSync(new URL("../app/viral-replication.tsx",import.meta.url),"utf8");
const replicationCss=readFileSync(new URL("../app/styles/replication-intelligence.css",import.meta.url),"utf8");

test("全站加载统一 AI Creative OS 视觉层",()=>{
 assert.match(layout,/design-tokens\.css/);
 assert.match(layout,/workspace-components\.css/);
 assert.match(tokens,/--vf-surface: #fff/);
 assert.match(tokens,/--vf-radius-lg: 16px/);
 assert.doesNotMatch(css + tokens,/!important/);
});

test("核心工作台共享编辑器、画布、素材库与检查器层级",()=>{
 for(const selector of [".creative-script-layout",".creative-layout.has-rail",".creative-image-canvas",".creative-library-list",".creative-inspector"])assert.match(css,new RegExp(selector.replaceAll(".","\\.")));
});

test("复刻与语音 Intelligence Rail 只展示当前真实状态",()=>{
 assert.match(replication,/replication-assistant/);
 assert.match(replication,/source\.title/);
 assert.match(replication,/target\.product/);
 assert.match(voice,/voice-intelligence/);
 assert.match(voice,/selectedVoice/);
 assert.match(voice,/text\.trim\(\)/);
});

test("1280 级别压缩 Inspector 且 900 以下使用非 fixed disclosure",()=>{
 assert.match(css,/@media \(max-width: 1400px\)/);
 assert.match(css,/minmax\(0,1fr\) 280px/);
 assert.match(css,/@media \(max-width: 900px\)/);
 assert.match(css,/\.creative-inspector-toggle \{ display: block/);
 assert.doesNotMatch(css,/\.creative-inspector[^}]*position:\s*fixed/);
});

test("展示层不包含虚假经营指标",()=>{
 const changed=`${voice}\n${replication}\n${css}\n${replicationCss}`;
 for(const fake of ["GMV ¥","播放 2.35亿","订单 4,328","增长率","AI 使用次数"])assert.equal(changed.includes(fake),false);
});

test("创意复刻升级为产品理解、AI画布与策略助手三栏",()=>{
 for(const marker of ["CREATIVE MAPPING WORKSPACE","ORIGINAL VIRAL PATTERN","AI REPLICATION ASSISTANT","mapping-board","concept-rail"])assert.match(replication,new RegExp(marker));
 assert.match(readFileSync(new URL("../app/styles/analyzer-replication-workspace.css",import.meta.url),"utf8"),/grid-template-columns:minmax\(620px,1fr\) 360px/);
});

test("产品理解与复刻洞察全部由当前状态派生",()=>{
 for(const marker of ["target.sellingPoints","source.analysis.hook.mechanism","source.analysis.proofMechanisms","strategy.targetProductFit","candidates.slice(0,3)"])assert.equal(replication.includes(marker),true,marker);
});

test("复刻工作流使用理解导向的四阶段命名",()=>{
 for(const label of ["ORIGINAL → PRODUCT","爆款机制 × 当前产品知识","三个真实生成方向","发送到 Script Workspace"])assert.match(replication,new RegExp(label));
});

test("复刻视觉层保留响应式与低动效规则",()=>{
 for(const width of ["1580","1350","980","680"])assert.match(replicationCss,new RegExp(`max-width:${width}px`));
 assert.match(replicationCss,/transition|var\(--os-gradient\)/);
});
