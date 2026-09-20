import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("Step 6.4-B exposes four real scores and isolated shot states",async()=>{
 const source=await readFile(new URL("../app/shooting-director.tsx",import.meta.url),"utf8");
 for(const field of ["hookStrength","visualImpact","productProof","conversionPotential"])assert.ok(source.includes(field),field);
 for(const state of ['"idle"','"loading"','"success"','"error"','"stale"'])assert.ok(source.includes(state),state);
 assert.ok(source.includes("分析失败 · 重试"));
 assert.match(source,/Object\.fromEntries\(\s*ids\.map/s);
 assert.match(source,/analyzeShots\(\[shots\[index\]\],\s*force/);
 assert.match(source,/previousShot:\s*shots\[index\s*-\s*1\]/);
 assert.match(source,/nextShot:\s*shots\[index\s*\+\s*1\]/);
});

test("Step 6.4-B creative directions reuse guarded shot regeneration",async()=>{
 const source=await readFile(new URL("../app/shooting-director.tsx",import.meta.url),"utf8");
 for(const direction of ["视觉冲击","产品证明","转化表达","TikTok 原生","低成本可拍"])assert.ok(source.includes(direction),direction);
 assert.match(source,/requestCandidate\(\s*index,\s*"regenerate-shot",\s*direction/s);
 assert.ok(source.includes("setPreview"));
 assert.doesNotMatch(source,/generate-shot-variations/);
});

test("AI Director is workspace-first even before a Director result exists",async()=>{
 const source=await readFile(new URL("../app/shooting-director.tsx",import.meta.url),"utf8");
 assert.match(source,/director-empty-workspace/);
 assert.match(source,/storyboard-empty-canvas/);
 assert.match(source,/还没有导演方案/);
 assert.match(source,/AI 副导演/);
 assert.doesNotMatch(source,/className="director-form"/);
});

test("AI Director restores the current project's persisted workspace",async()=>{
 const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
 const director=await readFile(new URL("../app/shooting-director.tsx",import.meta.url),"utf8");
 assert.match(page,/assets\.directorResult/);
 assert.match(page,/initialWorkspace=\{currentDirectorWorkspace\}/);
 for(const field of ["result","shots","selectedShot","intelligence","intelligenceMetadata"])assert.ok(director.includes(field),field);
 assert.match(director,/restoredWorkspace\(initialWorkspace\)/);
});
