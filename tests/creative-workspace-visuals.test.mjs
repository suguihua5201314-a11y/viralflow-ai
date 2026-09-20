import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const workspace = read("../app/project-asset-workspace.tsx");
const workspaceCss = read("../app/styles/workspace-components.css");
const tokens = read("../app/styles/design-tokens.css");
const imageWorkspace = read("../app/components/images/image-studio-workspace.tsx");

test("Creative workspace uses owned light design tokens without override rules", () => {
  for (const token of ["--vf-bg: #f7f8fc", "--vf-surface: #fff", "--vf-border: #e7eaf0", "--vf-brand: #635bff"]) {
    assert.ok(tokens.includes(token), token);
  }
  assert.doesNotMatch(tokens + workspaceCss, /!important/);
  assert.match(workspaceCss, /\.creative-image-canvas/);
  assert.match(workspaceCss, /\.creative-library-list/);
});

test("Creative workspace keeps readable typography floors", () => {
  assert.match(tokens, /--vf-font-body: 15px/);
  assert.match(workspaceCss, /font:\s*var\(--vf-font-body\)\/var\(--vf-line-body\)/);
  assert.match(workspaceCss, /:where\(small, dt, time\).*font-size: 12px/);
  assert.match(workspaceCss, /:where\(h2\).*font-size: 24px/);
  assert.match(workspaceCss, /:where\(h3\).*font-size: 18px/);
});

test("Images empty state and creator inspector remain presentation-only", () => {
  for (const label of ["开始创建视觉素材", "从 AI分镜导演生成", "输入提示词生成", "使用参考素材生成", "创作者面板", "素材预览", "用途", "来源", "高级信息"]) {
    assert.match(workspace, new RegExp(label));
  }
  assert.match(workspace, /<details className="os-paw-advanced-metadata">/);
  assert.match(imageWorkspace, /creative-image-canvas/);
  assert.match(workspace, /<button type="button" disabled title="视频创作即将开放">生成视频<\/button>/);
  assert.doesNotMatch(workspace, /generateVideo|\/api\/video/);
});
