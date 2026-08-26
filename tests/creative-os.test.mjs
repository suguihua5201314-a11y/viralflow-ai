import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css=readFileSync(new URL("../app/styles/creative-os.css",import.meta.url),"utf8");
const layout=readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");
const voice=readFileSync(new URL("../app/voice-studio.tsx",import.meta.url),"utf8");
const replication=readFileSync(new URL("../app/viral-replication.tsx",import.meta.url),"utf8");
const replicationCss=readFileSync(new URL("../app/styles/replication-intelligence.css",import.meta.url),"utf8");

test("全站加载统一 AI Creative OS 视觉层",()=>{
 assert.match(layout,/creative-os\.css/);
 assert.match(css,/--os-surface-1/);
 assert.match(css,/--os-card-radius:16px/);
});

test("五个核心工作台共享深色 Surface 与三栏层级",()=>{
 for(const selector of [".script-studio",".va-shell",".vr-shell",".director-studio",".voice-studio"])assert.match(css,new RegExp(selector.replace(".","\\.")));
 for(const grid of ["studio-grid","va-shell","vr-grid","workspace-shell","voice-layout"])assert.match(css,new RegExp(`${grid}\\{grid-template-columns:`));
});

test("复刻与语音 Intelligence Rail 只展示当前真实状态",()=>{
 assert.match(replication,/replication-assistant/);
 assert.match(replication,/source\.title/);
 assert.match(replication,/target\.product/);
 assert.match(voice,/voice-intelligence/);
 assert.match(voice,/selectedVoice/);
 assert.match(voice,/text\.trim\(\)/);
});

test("1280 级别自动折叠右栏且移动端回到单栏",()=>{
 assert.match(css,/@media\(max-width:1350px\)/);
 assert.match(css,/grid-column:1\/-1/);
 assert.match(css,/@media\(max-width:980px\)/);
 assert.match(css,/grid-template-columns:1fr!important/);
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
