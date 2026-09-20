import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=file=>readFileSync(new URL(`../app/${file}`,import.meta.url),"utf8");
const layout=read("layout.tsx");
const runtimeStyles=[
  "styles/dashboard.css",
  "styles/data-center.css",
  "styles/analyzer-replication-workspace.css",
  "styles/workspace-states.css",
  "checker.css",
].map(read).join("\n");

test("ordinary runtime workspaces use the shared light Creative OS palette",()=>{
  for(const token of ["var(--vf-bg)","var(--vf-surface)","var(--vf-border)","var(--vf-text)"]){
    assert.match(runtimeStyles,new RegExp(token.replace(/[()]/g,"\\$&")));
  }
  assert.doesNotMatch(runtimeStyles,/#000(?:000)?\b|#0b0f19\b|#0f172a\b|#101828\b|#111827\b|#121826\b|#1f2937\b/i);
  assert.doesNotMatch(runtimeStyles,/!important/);
});

test("retired Analyzer and Replication dark layers are no longer loaded",()=>{
  for(const file of ["viral-analyzer.css","viral-replication.css","replication-intelligence.css"]){
    assert.equal(layout.includes(file),false,file);
  }
});

test("intentional media darkness remains local to media and overlays",()=>{
  const globals=read("globals.css");
  const workspace=read("styles/workspace-components.css");
  assert.match(globals,/\.video-upload-card video\{[^}]*background:#111/);
  assert.match(workspace,/\.os-image-lightbox \{[^}]*background: #111318ed/);
  assert.match(workspace,/\.os-compare-modal[^}]*background: #11131855/);
});
