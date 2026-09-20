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

test("vNext Script separates the writing document from the shot breakdown", () => {
  for (const marker of ["vnext-script-canvas", "vnext-script-view-tabs", "vnext-script-text-view", "vnext-shot-breakdown", "vnext-proof-note", "vnext-inline-toolbar"]) assert.match(document, new RegExp(marker));
  assert.match(document, /脚本文本/);
  assert.match(document, /镜头拆解/);
  assert.match(css, /max-width: 860px/);
  assert.match(css, /\.vnext-writing-block-body p[^}]*font-size: 17px/s);
  assert.match(css, /\.creative-block-editor[^}]*display: none/s);
  assert.match(css, /\.creative-race-details[^}]*display: none/s);
});

test("vNext Script keeps real generation, rewrite, version and Director behavior", () => {
  for (const marker of ["onGenerate", "onGenerateRace", "requestRewrite", "saveVersion", "adoptRace", "sendToDirector"]) assert.match(studio, new RegExp(marker));
  assert.doesNotMatch(document, /fetch\(|localStorage|\/api\//);
});

test("vNext Script assistant is visually writing-first and settings stay collapsible", () => {
  assert.match(css, /AI 创作助手/);
  assert.match(css, /os-assistant-script-actions button[^}]*border-radius: 999px/s);
  assert.match(studio, /InspectorSection title="当前创意" open/);
  assert.match(studio, /InspectorSection title="AI 优化" open/);
  assert.match(studio, /InspectorSection title="脚本检查"/);
  assert.match(studio, /InspectorSection title="创作设置"/);
  assert.doesNotMatch(studio, /InspectorSection title="创作设置" open/);
});
