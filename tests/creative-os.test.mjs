import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const css=readFileSync(new URL("../app/styles/creative-os.css",import.meta.url),"utf8");
const layout=readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");
const voice=readFileSync(new URL("../app/voice-studio.tsx",import.meta.url),"utf8");
const replication=readFileSync(new URL("../app/viral-replication.tsx",import.meta.url),"utf8");

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
 assert.match(replication,/vr-intel-rail/);
 assert.match(replication,/source\?\.title/);
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
 const changed=`${voice}\n${replication}\n${css}`;
 for(const fake of ["GMV ¥","播放 2.35亿","订单 4,328","增长率","AI 使用次数"])assert.equal(changed.includes(fake),false);
});
