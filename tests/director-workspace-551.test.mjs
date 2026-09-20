import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

const ui=()=>readFile(new URL("../app/shooting-director.tsx",import.meta.url),"utf8");
const css=()=>readFile(new URL("../app/styles/director-workspace-v2.css",import.meta.url),"utf8");

test("Test A: Script to Director keeps the existing single data path",async()=>{const [director,page]=await Promise.all([ui(),readFile(new URL("../app/page.tsx",import.meta.url),"utf8")]);for(const marker of ["scriptBlocks(input.script)","input?.context.product","input?.context.creativeAngle","sourceBlockId"])assert.ok(director.includes(marker),marker);assert.match(page,/directorInput/);});
test("Test B: Project Memory schema remains untouched",async()=>{const memory=await readFile(new URL("../app/project-memory.ts",import.meta.url),"utf8");assert.match(memory,/viralflow-project-memory-v1/);assert.doesNotMatch(memory,/imagePrompt|videoPrompt/);});
test("Test C: Storyboard keeps editing, expand and collapse",async()=>{const source=await ui();for(const marker of ["分镜画布","updateShot","展开摄影 / 道具 / 剪辑 / 连贯性","收起摄影 / 道具 / 剪辑 / 连贯性"])assert.ok(source.includes(marker),marker);});
test("Test D: selected and editing states reuse existing component state",async()=>{const source=await ui();assert.match(source,/selected\s*===\s*index/);assert.match(source,/镜头编辑中|正在编辑/);assert.doesNotMatch(source,/createContext|zustand|redux/);});
test("Test E: saves still flow through the existing onChange callback",async()=>{const source=await ui();assert.match(source,/onChange\?\.\(\{\s*result,\s*shots:\s*updated,\s*listStatus:\s*"Draft"/s);assert.match(source,/已保存/);});
test("Test F: responsive layout preserves readable typography",async()=>{const style=await css();assert.match(style,/@media\s*\(max-width:\s*1280px\)/);assert.match(style,/@media\s*\(max-width:\s*900px\)/);assert.match(style,/font-size:\s*15px/);assert.match(style,/padding:\s*20px/);});
test("Test G: product workspace keeps the Director API and video-generation boundary intact",async()=>{const [source,route,panel]=await Promise.all([ui(),readFile(new URL("../app/api/director/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/director-shot-image.tsx",import.meta.url),"utf8")]);for(const marker of ["DIRECTOR BRIEF","AI 副导演","Image Prompt","Video Prompt","本阶段不调用视频模型"])assert.ok(source.includes(marker),marker);assert.match(panel,/\/api\/images\/generate/);assert.doesNotMatch(source+panel,/\/api\/(?:director-image|video-generate|generate-video)/);assert.match(route,/callProvider/);});
