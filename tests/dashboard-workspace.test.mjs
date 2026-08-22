import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const dashboard = readFileSync(new URL("../app/dashboard.tsx", import.meta.url), "utf8");
const sidebar = readFileSync(new URL("../app/components/layout/sidebar.tsx", import.meta.url), "utf8");
const header = readFileSync(new URL("../app/components/layout/top-header.tsx", import.meta.url), "utf8");
const navigation = readFileSync(new URL("../app/navigation.ts", import.meta.url), "utf8");
const styles = readFileSync(new URL("../app/styles/dashboard.css", import.meta.url), "utf8");
const metrics = readFileSync(new URL("../app/dashboard-metrics.ts", import.meta.url), "utf8");
const darkWorkspaces = readFileSync(new URL("../app/styles/dark-workspaces.css", import.meta.url), "utf8");

test("A-D Dashboard is the default and every renamed entry keeps a real ActiveView", () => {
  assert.match(page, /useState<ActiveView>\("dashboard"\)/);
  for (const id of ["create", "breakdown", "replicate", "director", "voice", "checker"]) {
    assert.match(dashboard, new RegExp(`view: "${id}"`));
  }
  for (const label of ["AI 创作工作台", "爆款洞察", "创意复刻", "内容合规", "视频洞察", "AI 导演工作台", "AI 语音工作台", "产品知识库", "创意案例库", "内容监测", "创作资产", "数据中心"]) {
    assert.ok(navigation.includes(label));
    assert.ok(sidebar.includes(label));
  }
});

test("E-G recent work, metrics and global search use existing state sources", () => {
  assert.match(page, /buildDashboardMetrics/);
  assert.match(page, /products:productProfiles/);
  assert.match(page, /cases:viralCases/);
  assert.match(page, /scripts:history/);
  assert.match(page, /currentScript:result/);
  assert.match(page, /providers:providerStatuses/);
  assert.match(metrics, /director: null/);
  assert.match(metrics, /date\.getTime\(\) <= 0/);
  assert.match(metrics, /activities\.sort/);
  assert.match(page, /\.\.\.productProfiles\.map/);
  assert.match(page, /\.\.\.viralCases\.map/);
  assert.match(page, /\.\.\.history\.map/);
  assert.match(header, /没有找到匹配的真实内容/);
  assert.doesNotMatch(dashboard, /86\.7万|4,328|2\.35亿|增长百分比|模型额度/);
});

test("K-L layout has desktop and compact breakpoints without decorative dead controls", () => {
  assert.match(styles, /@media\(max-width:1280px\)/);
  assert.match(styles, /@media\(max-width:800px\)/);
  assert.match(styles, /@media\(min-width:1680px\)/);
  assert.match(styles, /--vf-app-bg:#070b14/);
  assert.match(styles, /--vf-surface-1:#0d1320/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /vf-intelligence-rail/);
  assert.match(darkWorkspaces, /shared dark application workspace surfaces/);
  assert.match(darkWorkspaces, /\.script-studio/);
  assert.match(darkWorkspaces, /\.va-shell/);
  assert.match(darkWorkspaces, /\.vr-shell/);
  assert.match(darkWorkspaces, /\.director-studio/);
  assert.doesNotMatch(header, /aria-label="帮助"/);
  assert.match(header, /role="listbox"/);
  assert.match(header, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(header, /<kbd>⌘ K<\/kbd>/);
});
