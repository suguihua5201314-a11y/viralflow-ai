"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import FrameCard from "./components/frame-prompt/frame-card";
import PromptEditor from "./components/frame-prompt/prompt-editor";
import FrameShotNavigator from "./components/frame-prompt/shot-navigator";
import VisualAssistant from "./components/frame-prompt/visual-assistant";
import type { DirectorRequest, DirectorResult } from "./director-core";
import { shotImageSpec } from "./director-image";
import type { WorkspaceShot } from "./director-workspace";
import { buildFramePrompts, type FramePromptBundle } from "./frame-prompt";
import {
  readImageAssets,
  saveImageStudioDraft,
  type ImageAsset,
  type ImageFrameType,
  type ImageSourceReference,
} from "./image-assets";
import type { ActiveView } from "./navigation";
import type { PersistentProject } from "./project-memory";

type DirectorWorkspaceValue = {
  result: DirectorResult;
  shots: WorkspaceShot[];
  selectedShot?: number | null;
};

type PromptEdits = Partial<
  Pick<
    FramePromptBundle,
    | "startFramePrompt"
    | "endFramePrompt"
    | "imagePrompt"
    | "videoPrompt"
    | "negativePrompt"
  >
>;

function directorWorkspace(value: unknown): DirectorWorkspaceValue | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DirectorWorkspaceValue>;
  if (!candidate.result || !Array.isArray(candidate.shots)) return null;
  return candidate as DirectorWorkspaceValue;
}

function newestAsset(
  assets: ImageAsset[],
  shotId: string,
  frameType?: ImageFrameType,
) {
  return assets
    .filter((asset) => {
      const reference = asset.metadata?.sourceReference;
      if (reference?.shotId !== shotId) return false;
      if (!frameType) return reference.type === "director-shot";
      return (
        reference.type === "frame-prompt" && reference.frameType === frameType
      );
    })
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )[0];
}

export default function FramePromptWorkspace({
  project,
  request,
  workspace,
  scriptVersion,
  onNavigate,
  onSelectShot,
}: {
  project: PersistentProject | null;
  request: DirectorRequest | null;
  workspace: unknown;
  scriptVersion: string;
  onNavigate: (view: ActiveView) => void;
  onSelectShot: (index: number) => void;
}) {
  const director = directorWorkspace(workspace);
  const shots = director?.shots || [];
  const requestedIndex = director?.selectedShot ?? 0;
  const [selected, setSelected] = useState(() =>
    Math.min(Math.max(requestedIndex, 0), Math.max(0, shots.length - 1)),
  );
  const [assets, setAssets] = useState<ImageAsset[]>(readImageAssets);
  const [edits, setEdits] = useState<Record<string, PromptEdits>>({});
  const [lightbox, setLightbox] = useState<ImageAsset | null>(null);
  const shot = shots[selected] || null;

  useEffect(() => {
    setAssets(readImageAssets());
  }, [project?.id, shot?.shotId]);

  const automatic = useMemo(() => {
    if (!project || !request || !shot) return null;
    return buildFramePrompts(
      {
        projectId: project.id,
        projectName: project.name,
        scriptVersion,
        visualStyle: director?.result.directorPlan.visualStyle,
      },
      request,
      shot,
    );
  }, [
    director?.result.directorPlan.visualStyle,
    project,
    request,
    scriptVersion,
    shot,
  ]);

  const prompts = automatic
    ? { ...automatic, ...(shot ? edits[shot.shotId] : undefined) }
    : null;
  const projectAssets = project
    ? assets.filter((asset) => asset.projectId === project.id)
    : [];
  const previews = Object.fromEntries(
    shots.flatMap((item) => {
      const asset =
        newestAsset(projectAssets, item.shotId, "start-frame") ||
        newestAsset(projectAssets, item.shotId);
      return asset ? [[item.shotId, asset.imageUrl]] : [];
    }),
  );
  const startAsset = shot
    ? newestAsset(projectAssets, shot.shotId, "start-frame")
    : undefined;
  const endAsset = shot
    ? newestAsset(projectAssets, shot.shotId, "end-frame")
    : undefined;

  function chooseShot(index: number) {
    setSelected(index);
    onSelectShot(index);
  }

  function updatePrompt(key: keyof PromptEdits, value: string) {
    if (!shot) return;
    setEdits((current) => ({
      ...current,
      [shot.shotId]: { ...current[shot.shotId], [key]: value },
    }));
  }

  function openImages(prompt: string, frameType: ImageFrameType) {
    if (!project || !request || !shot || !director) return;
    const spec = shotImageSpec(
      shot,
      request,
      director.result.directorPlan.visualStyle,
      project.id,
    );
    const sourceReference: ImageSourceReference = {
      type: "frame-prompt",
      projectId: project.id,
      scriptVersion,
      shotId: shot.shotId,
      sourceBlockId: shot.sourceBlockId,
      frameType,
      promptType: frameType,
    };
    saveImageStudioDraft({
      projectId: project.id,
      prompt,
      imageType: spec.imageType,
      style: spec.style,
      camera: spec.camera,
      ratio: spec.ratio,
      sourceReference,
    });
    onNavigate("images");
  }

  if (!project) {
    return (
      <FrameEmpty
        title="请先选择项目"
        description="画面提示词必须跟随当前项目。"
        action="选择项目"
        onAction={() => onNavigate("projects")}
      />
    );
  }
  if (!request) {
    return (
      <FrameEmpty
        title="先创建脚本"
        description="完成脚本后，才能建立导演镜头与画面提示词。"
        action="进入脚本创作"
        onAction={() => onNavigate("create")}
      />
    );
  }
  if (!director || !shots.length || !shot || !automatic || !prompts) {
    return (
      <FrameEmpty
        title="先完成 AI 分镜"
        description="导演镜头会自动转换成首帧、尾帧、图片与视频提示词。"
        action="进入 AI 分镜导演"
        onAction={() => onNavigate("director")}
      />
    );
  }

  return (
    <section className="vnext-frame-workspace" data-project-id={project.id}>
      <header className="vnext-frame-header">
        <div>
          <span>AI VISUAL PROMPT STUDIO</span>
          <h1>画面提示词</h1>
          <p>把导演镜头转换成可生成的首尾帧与视频提示词</p>
          <small>
            {project.name} · {project.market} {project.platform} /{" "}
            {scriptVersion} / Shot {String(shot.order).padStart(2, "0")}
          </small>
        </div>
        <aside>
          <span>{edits[shot.shotId] ? "已编辑" : "自动提示词已准备"}</span>
          <button
            type="button"
            className="vf-button vf-button-primary"
            onClick={() => openImages(prompts.imagePrompt, "shot-image")}
          >
            生成图片 →
          </button>
        </aside>
      </header>

      <nav className="vnext-frame-flow" aria-label="画面提示词工作流">
        {["脚本创作", "AI 分镜导演", "画面提示词", "视觉创作", "视频生成"].map(
          (item, index) => (
            <span key={item} className={index === 2 ? "is-current" : ""}>
              {item}
              {index < 4 ? <i>→</i> : null}
            </span>
          ),
        )}
      </nav>

      <div className="vnext-frame-layout">
        <FrameShotNavigator
          shots={shots}
          selected={selected}
          previews={previews}
          onSelect={chooseShot}
        />
        <main className="vnext-frame-canvas">
          <header>
            <div>
              <span>SHOT {String(shot.order).padStart(2, "0")}</span>
              <h2>{prompts.visualGoal}</h2>
            </div>
            <small>
              {shot.duration.toFixed(1)} 秒 · {shot.framing}
            </small>
          </header>
          <div className="vnext-frame-pair">
            <FrameCard
              kind="start"
              title="首帧"
              imageUrl={startAsset?.imageUrl}
              prompt={prompts.startFramePrompt}
              automaticPrompt={automatic.startFramePrompt}
              onPromptChange={(value) =>
                updatePrompt("startFramePrompt", value)
              }
              onGenerate={() =>
                openImages(prompts.startFramePrompt, "start-frame")
              }
              onOpen={() => startAsset && setLightbox(startAsset)}
            />
            <div className="vnext-frame-motion">
              <span>START</span>
              <i>→</i>
              <p>{prompts.motionBridge}</p>
              <i>→</i>
              <span>END</span>
            </div>
            <FrameCard
              kind="end"
              title="尾帧"
              imageUrl={endAsset?.imageUrl}
              prompt={prompts.endFramePrompt}
              automaticPrompt={automatic.endFramePrompt}
              onPromptChange={(value) => updatePrompt("endFramePrompt", value)}
              onGenerate={() => openImages(prompts.endFramePrompt, "end-frame")}
              onOpen={() => endAsset && setLightbox(endAsset)}
            />
          </div>

          <PromptEditor
            label="IMAGE PROMPT"
            value={prompts.imagePrompt}
            automaticValue={automatic.imagePrompt}
            onChange={(value) => updatePrompt("imagePrompt", value)}
          />
          <button
            type="button"
            className="vnext-frame-generate-shot vf-button vf-button-secondary"
            onClick={() => openImages(prompts.imagePrompt, "shot-image")}
          >
            生成 Shot 图片 →
          </button>
          <PromptEditor
            label="VIDEO PROMPT"
            value={prompts.videoPrompt}
            automaticValue={automatic.videoPrompt}
            onChange={(value) => updatePrompt("videoPrompt", value)}
          />
          <div className="vnext-frame-video-future">
            <button type="button" disabled>
              准备视频 →
            </button>
            <span>视频生成将在下一阶段接入</span>
          </div>
          <details className="vnext-frame-consistency">
            <summary>CONSISTENCY · 一致性规则</summary>
            <div>
              {Object.entries(prompts.consistencyRules).map(([key, rules]) => (
                <section key={key}>
                  <h3>{key.toUpperCase()}</h3>
                  <ul>
                    {rules.map((rule) => (
                      <li key={rule}>{rule}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </details>
          <details className="vnext-frame-negative">
            <summary>NEGATIVE PROMPT</summary>
            <PromptEditor
              label="排除内容"
              value={prompts.negativePrompt}
              automaticValue={automatic.negativePrompt}
              onChange={(value) => updatePrompt("negativePrompt", value)}
              compact
            />
          </details>
        </main>
        <VisualAssistant shot={shot} request={request} prompts={prompts} />
      </div>

      {lightbox ? (
        <div
          className="vnext-frame-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="查看画面大图"
        >
          <button
            type="button"
            aria-label="关闭大图"
            onClick={() => setLightbox(null)}
          >
            ×
          </button>
          <Image
            src={lightbox.imageUrl}
            alt={lightbox.prompt}
            fill
            sizes="95vw"
            unoptimized
          />
        </div>
      ) : null}
    </section>
  );
}

function FrameEmpty({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <section className="vnext-frame-empty">
      <span>✦</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <button
        type="button"
        className="vf-button vf-button-primary"
        onClick={onAction}
      >
        {action} →
      </button>
    </section>
  );
}
