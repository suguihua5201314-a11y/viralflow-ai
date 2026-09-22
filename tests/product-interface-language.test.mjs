import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const sidebar = read("../app/components/layout/sidebar.tsx");
const header = read("../app/components/layout/top-header.tsx");
const navigation = read("../app/navigation.ts");
const workspace = read("../app/project-asset-workspace.tsx");
const assets = read("../app/image-assets.ts");

test("Global Sidebar 使用产品级导航且保留项目工作流页面", () => {
  for (const label of ["首页", "项目", "资产库", "爆款洞察", "创意复刻", "内容合规", "AI 语音"]) {
    assert.ok(sidebar.includes(`label: "${label}"`), label);
  }
  assert.doesNotMatch(sidebar, /label: "脚本创作"|label: "AI分镜导演"|label: "画面提示词"/);
  assert.match(sidebar, /Turn Ideas into Viral Videos/);
  assert.match(header, /内容管理/);
});

test("Step 7.0-C.3: Images 与 Assets 标题、操作和状态完成中文化", () => {
  for (const label of ["AI图片创作工作台", "项目素材库", "素材预览", "图片生成器", "查看大图", "复制提示词", "使用提示词", "重新生成", "返回导演分镜", "生成图片", "重新尝试", "生成中", "生成成功", "生成失败"]) {
    assert.ok(`${navigation}\n${workspace}`.includes(label), label);
  }
  for (const legacy of ["Project Asset Library", "Asset Inspector", "Image Composer", "Generate Image", "Retry Generation", "Go to Director Shot"]) {
    assert.doesNotMatch(`${navigation}\n${workspace}`, new RegExp(legacy));
  }
});

test("Step 7.0-C.3: 素材分类、筛选、空状态和 Tabs 使用业务中文", () => {
  assert.match(assets, /"导演分镜".*"画面提示词".*"AI图片创作"/);
  for (const label of ["全部来源", "全部分镜", "全部模型", "全部时间", "全部", "图片", "参考素材", "声音", "视频", "当前版本", "开始创建视觉素材", "视频功能即将开放"]) {
    assert.match(workspace, new RegExp(label));
  }
});
