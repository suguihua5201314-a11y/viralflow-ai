import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

async function loadOverrides() {
  const source = await read("app/frame-prompt-overrides.ts");
  const javascript = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);
}

const generated = {
  startFramePrompt: "generated start",
  endFramePrompt: "generated end",
  imagePrompt: "generated image",
  videoPrompt: "generated video",
  negativePrompt: "generated negative",
  consistencyRules: { character: [], product: [], background: [], camera: [], lighting: [] },
  motionBridge: "move",
  visualGoal: "goal",
};
const identity = { projectId: "project-a", scriptIdentity: "script:a", shotId: "shot-01" };

test("Generated + Override resolves an Effective Prompt without copying generation logic", async () => {
  const api = await loadOverrides();
  const records = api.saveFramePromptOverride([], identity, "startFramePrompt", "custom start", generated.startFramePrompt);
  const effective = api.effectiveFramePrompts(generated, api.findFramePromptOverride(records, identity));
  assert.equal(effective.startFramePrompt, "custom start");
  assert.equal(effective.endFramePrompt, generated.endFramePrompt);
});

test("save, reset, generated equality and empty-record cleanup are deterministic", async () => {
  const api = await loadOverrides();
  let records = api.saveFramePromptOverride([], identity, "imagePrompt", "custom image", generated.imagePrompt);
  assert.equal(records.length, 1);
  records = api.saveFramePromptOverride(records, identity, "videoPrompt", generated.videoPrompt, generated.videoPrompt);
  assert.equal(records.length, 1);
  assert.equal(records[0].videoPrompt, undefined);
  records = api.resetFramePromptOverride(records, identity, "imagePrompt");
  assert.deepEqual(records, []);
});

test("Project, Script and Shot identities are isolated", async () => {
  const api = await loadOverrides();
  const identities = [
    identity,
    { ...identity, projectId: "project-b" },
    { ...identity, scriptIdentity: "script:b" },
    { ...identity, shotId: "shot-02" },
  ];
  const records = identities.reduce((current, item, index) => api.saveFramePromptOverride(current, item, "imagePrompt", `custom-${index}`, generated.imagePrompt), []);
  assert.equal(records.length, 4);
  identities.forEach((item, index) => assert.equal(api.findFramePromptOverride(records, item).imagePrompt, `custom-${index}`));
});

test("legacy projects without overrides remain compatible and hydrate to generated prompts", async () => {
  const api = await loadOverrides();
  assert.equal(api.findFramePromptOverride(undefined, identity), undefined);
  assert.deepEqual(api.effectiveFramePrompts(generated, undefined), generated);
  const memory = JSON.parse(JSON.stringify({ version: 1, projects: [{ id: "project-a", assets: { scriptVersions: [] } }] }));
  assert.equal(memory.projects[0].assets.framePromptOverrides, undefined);
});

test("Workspace persists overrides through Project Memory and replaces session-only edits", async () => {
  const [workspace, page, memory] = await Promise.all([
    read("app/frame-prompt-workspace.tsx"),
    read("app/page.tsx"),
    read("app/project-memory.ts"),
  ]);
  assert.match(memory, /framePromptOverrides\?: FramePromptOverride\[\]/);
  assert.match(page, /promptOverrides=\{currentDirectorProject\?\.assets\.framePromptOverrides\|\|\[\]\}/);
  assert.match(page, /updateProjectMemory\(\{framePromptOverrides:records\}\)/);
  assert.match(workspace, /effectiveFramePrompts\(automatic, currentOverride\)/);
  assert.doesNotMatch(workspace, /setEdits|edits\[shot\.shotId\]/);
});

test("Prompt editor separates summary, view and edit modes", async () => {
  const editor = await read("app/components/frame-prompt/prompt-editor.tsx");
  assert.match(editor, /data-prompt-state=\{editing \? "edit" : expanded \? "view" : "summary"\}/);
  assert.match(editor, /expanded \? "收起" : "查看"/);
  assert.match(editor, /收起/);
  assert.match(editor, /function cancel\(\)/);
  assert.match(editor, /setDraft\(value\)/);
  assert.match(editor, /hasOverride \? "已自定义" : "AI 自动生成 · 已使用"/);
  assert.match(editor, /hasOverride \? <button type="button" onClick=\{onReset\}>恢复 AI 默认<\/button> : null/);
});

test("Advanced settings use progressive disclosure, shot-image stays compatible, and Video stays disabled", async () => {
  const workspace = await read("app/frame-prompt-workspace.tsx");
  assert.match(workspace, /<details className="vnext-frame-advanced">/);
  assert.match(workspace, /className="vnext-frame-advanced-list"/);
  assert.match(workspace, /高级生成设置/);
  assert.match(workspace, /openImages\(prompts\.imagePrompt, "shot-image"\)/);
  assert.match(workspace, /生成镜头参考图/);
  assert.match(workspace, /<button type="button" disabled title="Seedance 2\.5 当前尚未开通">生成视频<\/button>/);
  assert.doesNotMatch(workspace, /fetch\([^)]*video|VideoAsset|polling/i);
});

test("Assistant collapses without unmounting its local input state", async () => {
  const [workspace, assistant] = await Promise.all([
    read("app/frame-prompt-workspace.tsx"),
    read("app/components/frame-prompt/visual-assistant.tsx"),
  ]);
  assert.match(workspace, /const \[assistantCollapsed, setAssistantCollapsed\] = useState\(false\)/);
  assert.match(workspace, /collapsed=\{assistantCollapsed\}/);
  assert.match(workspace, /setAssistantCollapsed\(\(current\) => !current\)/);
  assert.match(assistant, /className=\{`vnext-frame-assistant\$\{collapsed \? " is-collapsed" : ""\}`\}/);
  assert.match(assistant, /aria-expanded=\{!collapsed\}/);
});

test("Start, End and Regenerate continue through the existing image generation action", async () => {
  const [workspace, card] = await Promise.all([
    read("app/frame-prompt-workspace.tsx"),
    read("app/components/frame-prompt/frame-card.tsx"),
  ]);
  assert.match(workspace, /generateFrame\(prompts\.startFramePrompt, "start-frame"\)/);
  assert.match(workspace, /generateFrame\(prompts\.endFramePrompt, "end-frame"\)/);
  assert.match(workspace, /generateAndSaveImage\(\{/);
  assert.match(card, /重新生成/);
});
