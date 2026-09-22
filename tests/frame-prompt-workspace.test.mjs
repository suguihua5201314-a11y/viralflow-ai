import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadBuilder() {
  const source = await read("app/frame-prompt.ts");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

const request = {
  script: { title: "防窥演示", scenes: [] },
  context: {
    product: "Transformers Screen Protector",
    sellingPoints: "安装器辅助对位；防窥效果；减少指纹影响",
    audience: "普通手机用户",
    market: "Spain",
    language: "Spanish",
    platform: "TikTok",
    targetDuration: 20,
    creativeMode: "KOC / UGC",
    hookStrategy: "Visual Test",
    framework: "Demo",
    creativeAngle: "正面到侧面的连续角度变化",
    sourceType: "script-studio",
  },
};

const shot = {
  shotId: "shot-03",
  sourceBlockId: "scene-3",
  order: 3,
  startTime: 6,
  endTime: 9,
  duration: 3,
  stage: "PROOF",
  purpose: "Demonstration / Verification",
  shotType: "Proof Shot",
  framing: "Medium Close-Up",
  cameraAngle: "Eye Level",
  cameraMovement: "Static",
  visualDescription: "手机从正面连续转向侧面，展示可见性变化",
  subject: "同一位 KOC 创作者与手机",
  productAction: "右手将手机从正面缓慢旋转到侧面",
  talentAction: "人物保持坐姿并稳定握住手机",
  props: ["手机", "保护膜"],
  environment: "自然光桌面环境",
  dialogue: "De frente se ve claro; de lado cambia.",
  voiceover: "",
  onScreenText: "",
  proofRequirement: "连续展示正面到侧面的屏幕变化",
  transition: "Clean Cut",
  editingNotes: "保持连续动作",
  audioSfx: "真实环境声",
  continuityNotes: "同一手机与光线",
  priority: "Critical",
  locked: false,
  status: "Draft",
};

test("Director Shot deterministically builds every Frame Prompt output", async () => {
  const { buildFramePrompts } = await loadBuilder();
  const context = {
    projectId: "project-a",
    projectName: "CrystalArmor Spain",
    scriptVersion: "Script V1",
    visualStyle: "真实 UGC",
  };
  const first = buildFramePrompts(context, request, shot);
  const second = buildFramePrompts(context, request, shot);
  assert.deepEqual(first, second);
  for (const key of [
    "startFramePrompt",
    "endFramePrompt",
    "imagePrompt",
    "videoPrompt",
    "consistencyRules",
    "negativePrompt",
  ]) assert.ok(first[key], key);
  assert.match(first.endFramePrompt, /Preserve from Start Frame/);
  assert.match(first.endFramePrompt, /Change only/);
  assert.doesNotMatch(first.startFramePrompt, /cinematic commercial/i);
  assert.match(first.imagePrompt, /产品演示优先/);
  assert.match(first.imagePrompt, /手部交互和动作结果/);
  assert.match(first.negativePrompt, /extra fingers/);
  assert.match(first.negativePrompt, /duplicate phone/);
});

test("Frame Prompt presentation reuses current Director, Images and project state", async () => {
  const [workspace, frameCard, page, images, assets, director, navigation] = await Promise.all([
    read("app/frame-prompt-workspace.tsx"),
    read("app/components/frame-prompt/frame-card.tsx"),
    read("app/page.tsx"),
    read("app/project-asset-workspace.tsx"),
    read("app/image-assets.ts"),
    read("app/shooting-director.tsx"),
    read("app/navigation.ts"),
  ]);
  for (const marker of [
    "START FRAME",
    "END FRAME",
    "IMAGE PROMPT",
    "VIDEO PROMPT",
    "CONSISTENCY",
    "NEGATIVE PROMPT",
  ]) assert.ok(`${workspace}\n${frameCard}`.includes(marker), marker);
  assert.match(page, /active === "frames"/);
  assert.match(navigation, /frames/);
  assert.match(director, /onNavigate\?\.\("frames"\)/);
  assert.match(workspace, /saveImageStudioDraft/);
  for (const frameType of ["start-frame", "end-frame", "shot-image"])
    assert.ok(workspace.includes(frameType), frameType);
  assert.match(assets, /type: "frame-prompt"/);
  assert.match(assets, /shotId: string/);
  assert.match(images, /takeImageStudioDraft/);
  assert.match(images, /saveImageAssets/);
  assert.doesNotMatch(workspace, /\/api\/images\/generate|fetch\(/);
});

test("Frame Prompt keeps project isolation and explicit missing-shot states", async () => {
  const [workspace, editor] = await Promise.all([
    read("app/frame-prompt-workspace.tsx"),
    read("app/components/frame-prompt/prompt-editor.tsx"),
  ]);
  assert.match(workspace, /asset\.projectId === project\.id/);
  assert.match(workspace, /先完成 AI 分镜/);
  assert.match(workspace, /请先选择项目/);
  assert.match(workspace, /先创建脚本/);
  assert.match(editor, /AI Prompt Enhancement 将在 Provider 接入后开放/);
});

test("Frame Prompt responsive layout preserves a flexible canvas", async () => {
  const css = await read("app/styles/vnext-frame-prompt.css");
  assert.match(css, /grid-template-columns:\s*210px minmax\(0, 1fr\) 286px/);
  assert.match(css, /\.vnext-frame-prompt-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.vnext-frame-preview\s*\{[^}]*aspect-ratio:\s*16 \/ 9/);
  assert.match(css, /@media \(max-width: 1280px\)/);
  assert.match(css, /@media \(max-width: 1100px\)/);
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.doesNotMatch(css, /!important/);
});

test("Frame Prompt keeps per-shot editors and existing image handoff after layout change", async () => {
  const [workspace, card, navigator] = await Promise.all([
    read("app/frame-prompt-workspace.tsx"),
    read("app/components/frame-prompt/frame-card.tsx"),
    read("app/components/frame-prompt/shot-navigator.tsx"),
  ]);
  assert.match(workspace, /key=\{`\$\{shot\.shotId\}-start`\}/);
  assert.match(workspace, /key=\{`\$\{shot\.shotId\}-end`\}/);
  assert.match(workspace, /onSelectShot\(index\)/);
  assert.match(workspace, /saveImageStudioDraft\(\{/);
  assert.match(workspace, /sourceReference,/);
  assert.doesNotMatch(card, /PromptEditor/);
  assert.match(navigator, /onClick=\{\(\) => onSelect\(index\)\}/);
});
