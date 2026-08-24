import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const ui=()=>readFile(new URL("../app/shooting-director.tsx",import.meta.url),"utf8");
const css=()=>readFile(new URL("../app/styles/director-workspace-v2.css",import.meta.url),"utf8");

test("Test A: Script to Director keeps the existing single data path",async()=>{const [director,page]=await Promise.all([ui(),readFile(new URL("../app/page.tsx",import.meta.url),"utf8")]);for(const marker of ["scriptBlocks(input.script)","input?.context.product","input?.context.creativeAngle","sourceBlockId"])assert.ok(director.includes(marker),marker);assert.match(page,/directorInput/);});
test("Test B: Project Memory schema remains untouched",async()=>{const memory=await readFile(new URL("../app/project-memory.ts",import.meta.url),"utf8");assert.match(memory,/viralflow-project-memory-v1/);assert.doesNotMatch(memory,/imagePrompt|videoPrompt/);});
test("Test C: Storyboard keeps editing, expand and collapse",async()=>{const source=await ui();for(const marker of ["STORYBOARD CANVAS","updateShot","展开摄影 / 道具 / 剪辑 / 连贯性","收起摄影 / 道具 / 剪辑 / 连贯性"])assert.ok(source.includes(marker),marker);});
test("Test D: selected and editing states reuse existing component state",async()=>{const source=await ui();assert.match(source,/selected===index/);assert.match(source,/镜头编辑中|正在编辑/);assert.doesNotMatch(source,/createContext|zustand|redux/);});
test("Test E: saves still flow through the existing onChange callback",async()=>{const source=await ui();assert.match(source,/onChange\?\.\(\{result,shots:updated,listStatus:"Draft"/);assert.match(source,/已保存/);});
test("Test F: responsive layout preserves readable typography",async()=>{const style=await css();assert.match(style,/@media\(max-width:1450px\)/);assert.match(style,/@media\(max-width:980px\)/);assert.match(style,/font-size:15px/);assert.match(style,/padding:20px/);});
test("Test G: product workspaces and future model boundary remain intact",async()=>{const [source,route]=await Promise.all([ui(),readFile(new URL("../app/api/director/route.ts",import.meta.url),"utf8")]);for(const marker of ["DIRECTOR BRIEF","AI DIRECTOR ASSISTANT","Image Prompt","Video Prompt","当前阶段不调用图片或视频模型"])assert.ok(source.includes(marker),marker);assert.doesNotMatch(source,/api\/(image|video|generate-image|generate-video)/);assert.match(route,/callProvider/);});
