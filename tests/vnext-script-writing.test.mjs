import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const studio = read("../app/script-studio.tsx");
const document = read("../app/components/script/script-document.tsx");
const header = read("../app/components/script/vnext-script-header.tsx");
const css = read("../app/styles/vnext-script-workspace.css");

test("vNext Script starts with a writing header instead of the legacy editor toolbar", () => {
  assert.match(studio, /VNextScriptHeader/);
  assert.match(header, /脚本创作/);
  assert.match(header, /重新生成/);
  assert.match(css, /\.os-script-studio \.os-studio-titlebar \{\s*display: none/);
  assert.match(css, /\.os-script-studio \.os-studio-editor-head \{\s*display: none/);
});

test("vNext Script is a bounded document with Hook, spoken copy, Proof and timeline", () => {
  for (const marker of ["vnext-script-canvas", "vnext-hook-block", "vnext-spoken-script", "vnext-proof-block", "vnext-shot-timeline", "vnext-cta-block"]) assert.match(document, new RegExp(marker));
  assert.match(css, /max-width: 860px/);
  assert.match(css, /\.vnext-spoken-script > p[^}]*font-size: 17px/s);
});

test("vNext Script keeps real generation, rewrite, version and Director behavior", () => {
  for (const marker of ["onGenerate", "onGenerateRace", "requestRewrite", "saveVersion", "adoptRace", "sendToDirector"]) assert.match(studio, new RegExp(marker));
  assert.doesNotMatch(document, /fetch\(|localStorage|\/api\//);
});

test("vNext Script assistant is visually writing-first and settings stay collapsible", () => {
  assert.match(css, /AI 创作助手/);
  assert.match(css, /os-assistant-script-actions button[^}]*border-radius: 999px/s);
  assert.match(studio, /InspectorSection title="创作需求"/);
  assert.doesNotMatch(studio, /InspectorSection title="创作需求" open/);
});
