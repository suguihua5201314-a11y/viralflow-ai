import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const layout = read("../app/layout.tsx");
const styles = read("../app/styles/workspace-components.css");
const tokens = read("../app/styles/design-tokens.css");
const page = read("../app/page.tsx");
const workflow = read("../app/components/layout/workflow-step-bar.tsx");

test("v2 owns a component-level light workspace architecture without theme overrides", () => {
  for (const marker of ["creative-script-layout", ".creative-layout.has-rail", "creative-image-canvas", "creative-library", "creative-knowledge"]) {
    assert.ok(styles.includes(marker) || [page, read("../app/script-studio.tsx"), read("../app/components/director/director-workspace.tsx"), read("../app/components/images/image-studio-workspace.tsx"), read("../app/components/assets/asset-library-workspace.tsx"), read("../app/components/project-brain/project-brain-workspace.tsx")].some(source => source.includes(marker)), marker);
  }
  assert.match(layout, /design-tokens\.css/);
  assert.match(layout, /workspace-components\.css/);
  assert.doesNotMatch(layout, /light-creative-os|global-dark-cleanup|dark-workspaces|creative-os\.css/);
  assert.doesNotMatch(styles + tokens, /!important/);
});

test("workflow only presents real current and available states", () => {
  assert.match(workflow, /index === activeIndex \? "is-active" : ""/);
  assert.doesNotMatch(workflow, /is-complete|index < activeIndex|"✓"/);
  assert.match(workflow, /label: "视频分析"/);
});

test("Project Brain is a dedicated view backed by existing project and knowledge state", () => {
  assert.match(page, /active === "brain"/);
  assert.match(page, /projectMemory\.projects\.find/);
  assert.match(page, /productProfiles\.find/);
  assert.doesNotMatch(read("../app/project-memory.ts"), /brandVoice|marketContext|referenceScripts/);
});

test("responsive inspectors never use fixed positioning", () => {
  assert.match(styles, /@media \(max-width: 1400px\)/);
  assert.match(styles, /@media \(max-width: 900px\)/);
  assert.match(styles, /creative-inspector\.is-open/);
  assert.doesNotMatch(styles, /\.creative-inspector[^}]*position:\s*fixed/);
});
