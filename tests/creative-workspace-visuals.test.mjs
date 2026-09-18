import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const workspace = read("../app/project-asset-workspace.tsx");
const workspaceCss = read("../app/styles/project-asset-workspace.css");
const darkCss = read("../app/styles/global-dark-cleanup.css");
const typographyCss = read("../app/styles/typography.css");

test("Creative workspace uses the shared dark visual tokens", () => {
  for (const token of ["--vf-app-bg: #080b14", "--vf-app-surface: #111827", "--vf-app-border: #27324a"]) {
    assert.ok(darkCss.includes(token), token);
  }
  assert.match(workspaceCss, /\.paw-board\{[^}]*background:radial-gradient/);
  assert.match(workspaceCss, /content:"CREATIVE CANVAS"/);
  assert.match(workspaceCss, /\.paw-card\{[^}]*background:#111827/);
});

test("Creative workspace keeps readable typography floors", () => {
  assert.match(typographyCss, /\.vf-workspace\.vf-workspace :where\(p,li,label,button,input,select,textarea,dd\)\{font-size:14px!important\}/);
  assert.match(typographyCss, /\.vf-workspace\.vf-workspace :where\(small,dt,time/);
  assert.match(workspaceCss, /\.paw-heading h2\{font-size:24px!important/);
  assert.match(workspaceCss, /\.paw-inspector header h3,.paw-composer header h3\{font-size:18px!important/);
});

test("Images empty state and creator inspector remain presentation-only", () => {
  for (const label of ["开始创建视觉素材", "从 AI分镜导演生成", "输入提示词生成", "使用参考素材生成", "创作者面板", "素材预览", "用途", "来源", "高级信息"]) {
    assert.match(workspace, new RegExp(label));
  }
  assert.match(workspace, /<details className="paw-advanced-metadata">/);
  assert.match(workspace, /<button type="button" disabled title="视频创作即将开放">生成视频<\/button>/);
  assert.doesNotMatch(workspace, /generateVideo|\/api\/video/);
});
