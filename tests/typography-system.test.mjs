import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const typography=fs.readFileSync(new URL("../app/styles/typography.css",import.meta.url),"utf8");
const layout=fs.readFileSync(new URL("../app/layout.tsx",import.meta.url),"utf8");
const page=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");

test("global typography tokens define the approved hierarchy",()=>{
  for(const token of ["--vf-type-page","--vf-type-section","--vf-type-card","--vf-type-body","--vf-type-caption","--vf-type-label","--vf-leading-heading","--vf-leading-body"])assert.match(typography,new RegExp(token));
  assert.match(typography,/--vf-type-page:clamp\(24px,2vw,32px\)/);
  assert.match(typography,/--vf-type-body:15px/);
});

test("typography layer loads last without changing application behavior",()=>{
  assert.match(layout,/design-tokens\.css";\s*import "\.\/styles\/workspace-components\.css";/);
  assert.doesNotMatch(typography,/@media.*prefers-color-scheme/);
  assert.match(page,/readProjectMemory\(\)/);
});

test("Test A: Script Studio long text uses readable block sizing",()=>{
  assert.match(typography,/\.block-main\{padding:20px 22px!important\}/);
  assert.match(typography,/\.block-main>p,.block-main>textarea\{font-size:15px!important;line-height:1\.7!important\}/);
  assert.match(typography,/\.block-main>header span\{font-size:16px!important/);
});

test("Test B: Analyzer long reports use readable copy and card spacing",()=>{
  assert.match(typography,/\.va-shell p,.va-shell small/);
  assert.match(typography,/font-size:13px!important;line-height:1\.65!important/);
  assert.match(typography,/\.va-source,.va-analysis,.va-intel\{padding:22px!important\}/);
});

test("Test C: Replication workspace keeps 12px minimum controls and roomy cards",()=>{
  assert.match(typography,/\.vr-setup input,.vr-setup textarea,.vr-setup select/);
  assert.match(typography,/\.vr-card,.vr-strategy article,.vr-race article,.vr-compare article\{padding:20px!important\}/);
});

test("Test D: Director production content is enlarged",()=>{
  assert.match(typography,/\.director-shot-card\.workspace>header\{padding:14px 16px!important\}/);
  assert.match(typography,/\.director-shot-grid dd/);
  assert.match(typography,/font-size:14px!important;line-height:1\.65!important/);
});

test("Test E: Dashboard cards and captions follow the system",()=>{
  assert.match(typography,/\.vf-quick-grid h3/);
  assert.match(typography,/font-size:16px!important;font-weight:600!important/);
  assert.match(typography,/\.vf-quick-grid button,.vf-metric-grid article,.vf-recent-list article\{padding:18px!important\}/);
});

test("Test F: refresh persistence path remains unchanged",()=>{
  assert.match(page,/cacheProjectMemory\(projectMemory\)/);
  assert.match(page,/fetch\("\/api\/project-memory"/);
});

test("desktop and laptop layouts preserve readable type",()=>{
  assert.match(typography,/@media\(max-width:1300px\)/);
  assert.match(typography,/@media\(max-width:900px\)/);
  assert.doesNotMatch(typography,/@media[^}]+font-size:(?:[0-9]|10|11)px/);
});
