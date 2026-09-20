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

test("A-D Dashboard is the default and every renamed entry keeps a real ActiveView", () => {
  assert.match(page, /useState<ActiveView>\("dashboard"\)/);
  for (const id of ["breakdown", "create", "director", "images", "assets", "voice"]) {
    assert.match(dashboard, new RegExp(`view: "${id}"`));
  }
  for (const label of ["AI 创作工作台", "爆款洞察", "创意复刻", "内容合规", "视频洞察", "AI分镜导演工作台", "AI配音工作台", "产品知识库", "创意案例库", "内容监测", "脚本历史", "数据中心"]) {
    assert.ok(navigation.includes(label));
    assert.ok(sidebar.includes(label));
  }
  assert.ok(navigation.includes("项目素材库"));
  assert.ok(sidebar.includes("项目素材库"));
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

test("K-L layout has light Creative OS surfaces and responsive breakpoints", () => {
  assert.match(styles, /@media \(max-width: 1280px\)/);
  assert.match(styles, /@media \(max-width: 800px\)/);
  assert.match(styles, /@media \(min-width: 1680px\)/);
  assert.match(styles, /max-width:\s*1360px/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0, 1\.5fr\) minmax\(340px, 1fr\)/);
  assert.match(styles, /min-height:\s*344px/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /vf-command-bar/);
  assert.match(styles, /vf-pipeline/);
  assert.match(styles, /vf-project-card-grid/);
  assert.doesNotMatch(styles, /#070b14|#0d1320|#111827|--vf-dark/);
  assert.doesNotMatch(header, /aria-label="帮助"/);
  assert.match(header, /role="listbox"/);
  assert.match(header, /event\.metaKey \|\| event\.ctrlKey/);
  assert.match(header, /<kbd>⌘ K<\/kbd>/);
});

test("Home vNext is a visual creative platform backed by real image assets", () => {
  for (const copy of ["今天想", "创作什么", "完整创作流程", "快速开始", "创意灵感", "继续创作"]) {
    assert.ok(dashboard.includes(copy));
  }
  assert.match(dashboard, /readImageAssets/);
  assert.match(dashboard, /latestAssetByProject/);
  assert.match(dashboard, /inspirationAssets/);
  assert.match(dashboard, /即将开放完整成片工作流/);
  assert.doesNotMatch(dashboard, /Fake Views|Fake Likes|GMV|播放量/);
  assert.match(page, /DATA_MODE==="demo"\?demoRecent:\[\]/);
});
