"use client";

import { useState } from "react";
import type { DirectorRequest } from "../../director-core";
import type { WorkspaceShot } from "../../director-workspace";
import type { FramePromptBundle } from "../../frame-prompt";

export default function VisualAssistant({
  shot,
  request,
  prompts,
  onAction,
  onInstruction,
}: {
  shot: WorkspaceShot;
  request: DirectorRequest;
  prompts: FramePromptBundle;
  onAction: (action: "prompt" | "consistency" | "style" | "variants") => void;
  onInstruction: (instruction: string) => void;
}) {
  const [instruction, setInstruction] = useState("");
  const suggestions = [
    "保持人物与产品在首尾帧中一致。",
    shot.cameraMovement === "Static"
      ? "保持固定机位，突出产品动作。"
      : `镜头仅执行 ${shot.cameraMovement}，避免额外运动。`,
    "让动作从首帧自然延续到尾帧。",
  ];

  return (
    <aside className="vnext-frame-assistant" aria-label="AI 画面助手">
      <header>
        <span>✦ AI 画面助手</span>
        <h2>Shot {String(shot.order).padStart(2, "0")}</h2>
        <p>{prompts.visualGoal}</p>
      </header>
      <section>
        <h3>视觉策略</h3>
        <p>{request.context.creativeMode} · {shot.framing} · {shot.cameraAngle}</p>
        <small>{shot.proofRequirement || shot.productAction}</small>
      </section>
      <section className="vnext-frame-suggestions">
        <h3>当前镜头建议</h3>
        <ol>
          {suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ol>
      </section>
      <section className="vnext-frame-quick-actions">
        <h3>Quick Actions</h3>
        <div>
          <button type="button" onClick={() => onAction("prompt")}>优化提示词</button>
          <button type="button" onClick={() => onAction("consistency")}>增强一致性</button>
          <button type="button" onClick={() => onAction("style")}>调整风格</button>
          <button type="button" onClick={() => onAction("variants")}>生成更多变体</button>
        </div>
        <small>打开对应编辑区域；图片生成沿用视觉创作工作台。</small>
      </section>
      <form className="vnext-frame-assistant-input" onSubmit={(event) => { event.preventDefault(); if (!instruction.trim()) return; onInstruction(instruction.trim()); setInstruction(""); }}>
        <label htmlFor="frame-assistant-instruction">输入你的需求...</label>
        <textarea id="frame-assistant-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={2} placeholder="例如：更突出产品边缘光线" />
        <button type="submit" disabled={!instruction.trim()}>加入图片提示词 →</button>
      </form>
    </aside>
  );
}
