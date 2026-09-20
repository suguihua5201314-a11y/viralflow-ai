import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),"utf8");
const state=read("app/components/ui/workspace-state.tsx");
const feedback=read("app/components/ui/workspace-feedback.tsx");
const css=read("app/styles/workspace-states.css");
const screens=["app/dashboard.tsx","app/script-studio.tsx","app/viral-analyzer.tsx","app/shooting-director.tsx","app/voice-studio.tsx"].map(read).join("\n");

test("统一工作台状态覆盖空、加载、错误、搜索与不可用",()=>{
 for(const marker of ['"empty"','"loading"','"error"','"search"','"unavailable"'])assert.match(state,new RegExp(marker));
 assert.match(state,/workspace-state-progress/);
});

test("五个核心工作台使用统一状态或真实状态语义",()=>{
 for(const marker of ["WorkspaceState","今天想","创作什么","AI 正在构建脚本结构","正在理解爆款机制","正在规划镜头与时长","正在生成真实音频"])assert.match(screens,new RegExp(marker));
});

test("统一反馈覆盖成功、错误、信息与克制动效",()=>{
 for(const marker of ['"success"','"error"','"info"',"viralflow:notice"])assert.match(feedback,new RegExp(marker));
 assert.match(css,/190ms/);assert.match(css,/prefers-reduced-motion/);
});

test("状态展示不包含虚假经营数据",()=>{
 const source=`${state}\n${feedback}\n${css}\n${screens}`;
 for(const fake of ["GMV ¥","播放 2.35亿","订单 4,328","虚假增长率"])assert.equal(source.includes(fake),false);
});
