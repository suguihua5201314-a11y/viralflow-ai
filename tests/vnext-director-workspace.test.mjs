import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("vNext Director uses the shot rail, storyboard canvas and assistant architecture", async () => {
  const [director, workspace, canvas, assistant] = await Promise.all([
    read("app/shooting-director.tsx"),
    read("app/components/director/director-workspace.tsx"),
    read("app/components/director/storyboard-canvas.tsx"),
    read("app/components/director/director-assistant.tsx"),
  ]);

  for (const component of ["DirectorHeader", "DirectorWorkspace", "StoryboardCanvas", "DirectorAssistant"])
    assert.ok(director.includes(component), component);
  assert.match(workspace, /vnext-shot-rail/);
  assert.match(canvas, /vnext-storyboard-canvas/);
  assert.match(assistant, /AI 导演助手/);
  for (const section of ["镜头策略", "摄影设计", "Proof 设计", "镜头检查", "高级设置"])
    assert.ok(assistant.includes(section), section);
});

test("vNext Director keeps image generation and Image Studio transfer on the existing component", async () => {
  const [canvas, image, action] = await Promise.all([
    read("app/components/director/storyboard-canvas.tsx"),
    read("app/director-shot-image.tsx"),
    read("app/image-generation-action.ts"),
  ]);

  assert.match(canvas, /DirectorShotImage/);
  assert.match(image, /sourceReference/);
  assert.match(image, /shotId/);
  assert.match(image, /sourceBlockId/);
  assert.match(image, /generateAndSaveImage/);
  assert.match(action, /\/api\/images\/generate/);
});

test("vNext Director is light, responsive and keeps the canvas as the flexible primary region", async () => {
  const css = await read("app/styles/director-workspace-v2.css");
  assert.match(css, /grid-template-columns:\s*230px\s+minmax\(0,\s*1fr\)\s+330px/);
  assert.match(css, /@media\s*\(max-width:\s*1280px\)/);
  assert.match(css, /@media\s*\(max-width:\s*900px\)/);
  assert.match(css, /--vf-surface/);
  assert.doesNotMatch(css, /!important/);
  assert.match(css, /os-director-legacy-presentation\s*\{\s*display:\s*none/s);
});
