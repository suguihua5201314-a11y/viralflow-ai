import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const componentCss = read("../app/styles/components.css");
const workspaceCss = read("../app/styles/workspace-components.css");
const tokens = read("../app/styles/design-tokens.css");

test("shared action system defines accessible primary, secondary, tertiary, danger and card variants", () => {
  for (const variant of ["primary", "secondary", "tertiary", "danger", "card"]) {
    assert.match(componentCss, new RegExp(`\\.vf-button-${variant}`));
  }
  assert.match(tokens, /--vf-action-primary: #5b5bf7/);
  assert.match(workspaceCss, /\.vf-button-primary[\s\S]*?min-height: 42px/);
  assert.match(workspaceCss, /\.vf-button-primary[\s\S]*?font-size: 15px/);
  assert.match(workspaceCss, /button:not\(\.vf-button\) \{ font-size: max\(14px, 1em\); \}/);
  assert.doesNotMatch(workspaceCss, /\.vf-button[\s\S]{0,220}!important/);
});

test("high-value product actions opt into the shared hierarchy", () => {
  const dashboard = read("../app/dashboard.tsx");
  const projects = read("../app/project-workspace.tsx");
  const script = read("../app/script-studio.tsx");
  const director = read("../app/shooting-director.tsx");
  const shotImage = read("../app/director-shot-image.tsx");
  const images = read("../app/project-asset-workspace.tsx");
  const voice = read("../app/voice-studio.tsx");
  assert.match(dashboard, /vf-button-primary[^>]*>[\s\S]*?开始新创作/);
  assert.match(dashboard, /vf-button-card[^>]*>[\s\S]*?打开项目/);
  assert.match(projects, /vf-button-card[^>]*>[\s\S]*?进入工作区/);
  assert.match(projects, /vf-button-primary[^>]*>[\s\S]*?新建项目/);
  assert.match(script, /os-variant-primary vf-button vf-button-secondary/);
  assert.match(script, /os-pipeline-primary vf-button vf-button-primary/);
  assert.match(director, /os-primary vf-button vf-button-primary[^>]*>确认导演分镜/);
  assert.match(shotImage, /className="vf-button vf-button-card"[^>]*>[\s\S]*?\{buttonLabel\}/);
  assert.match(images, /os-paw-generate vf-button vf-button-primary/);
  assert.match(voice, /voice-generate vf-button vf-button-primary/);
});
