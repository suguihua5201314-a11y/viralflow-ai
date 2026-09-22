"use client";

import Image from "next/image";
import { useState } from "react";
import type { DirectorRequest } from "../../director-core";
import type { WorkspaceShot } from "../../director-workspace";
import type { FramePromptBundle } from "../../frame-prompt";

export default function VisualAssistant({
  shot,
  request,
  prompts,
  referenceImages,
  onAction,
  onInstruction,
}: {
  shot: WorkspaceShot;
  request: DirectorRequest;
  prompts: FramePromptBundle;
  referenceImages: Array<{ id: string; imageUrl: string; prompt: string }>;
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
    ...(shot.proofRequirement ? [shot.proofRequirement] : []),
  ];

  return (
    <aside className="vnext-frame-assistant" aria-label="AI 画面助手">
      <header>
        <span className="vnext-frame-assistant-mark" aria-hidden="true">✦</span>
        <div><h2>AI 视觉助手 <small>Beta</small></h2><p>基于当前导演分镜的画面建议</p></div>
      </header>
      <section className="vnext-frame-assistant-context">
        <small>Current Shot · Shot {String(shot.order).padStart(2, "0")}</small>
        <p>{prompts.visualGoal}</p>
        <span>{request.context.creativeMode} · {shot.framing} · {shot.cameraAngle}</span>
        <h3>视觉建议</h3>
        <ol>
          {suggestions.map((suggestion) => (
            <li key={suggestion}>{suggestion}</li>
          ))}
        </ol>
      </section>
      <section className="vnext-frame-quick-actions" aria-label="快捷操作">
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
      <section className="vnext-frame-reference-images">
        <h3>参考图 <small>Reference Images</small></h3>
        {referenceImages.length ? (
          <div>{referenceImages.slice(0, 4).map((asset) => (
            <span key={asset.id}><Image src={asset.imageUrl} alt={asset.prompt || "项目参考图"} fill sizes="72px" unoptimized /></span>
          ))}</div>
        ) : <p>当前项目暂无参考图</p>}
      </section>
    </aside>
  );
}
