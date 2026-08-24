import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("Step 6.4-B exposes four real scores and isolated shot states",async()=>{
 const source=await readFile(new URL("../app/shooting-director.tsx",import.meta.url),"utf8");
 for(const field of ["hookStrength","visualImpact","productProof","conversionPotential"])assert.ok(source.includes(field),field);
 for(const state of ['"idle"','"loading"','"success"','"error"','"stale"'])assert.ok(source.includes(state),state);
 assert.ok(source.includes("分析失败 · 重试"));
 assert.ok(source.includes("Object.fromEntries(ids.map"));
 assert.ok(source.includes("shots.slice(from,to)"));
});

test("Step 6.4-B creative directions reuse guarded shot regeneration",async()=>{
 const source=await readFile(new URL("../app/shooting-director.tsx",import.meta.url),"utf8");
 for(const direction of ["视觉冲击","产品证明","转化表达","TikTok 原生","低成本可拍"])assert.ok(source.includes(direction),direction);
 assert.match(source,/requestCandidate\(index,"regenerate-shot",direction\)/);
 assert.ok(source.includes("setPreview"));
 assert.doesNotMatch(source,/generate-shot-variations/);
});
