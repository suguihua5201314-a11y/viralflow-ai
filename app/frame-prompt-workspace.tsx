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
  effectiveFramePrompts,
  findFramePromptOverride,
  resetFramePromptOverride,
  saveFramePromptOverride,
  type FramePromptOverride,
  type FramePromptOverrideKey,
} from "./frame-prompt-overrides";
import {
  readImageAssets,
  newestFrameAsset,
  resolveScriptIdentity,
  saveImageStudioDraft,
  type ImageAsset,
  type ImageFrameType,
  type ImageSourceReference,
} from "./image-assets";
import type { ActiveView } from "./navigation";
import type { PersistentProject } from "./project-memory";
import { generateAndSaveImage, ImageGenerationActionError } from "./image-generation-action";

type DirectorWorkspaceValue = {
  result: DirectorResult;
  shots: WorkspaceShot[];
  selectedShot?: number | null;
};

type FrameGenerationState = {
  status: "idle" | "loading" | "success" | "error";
  error: string;
};

function directorWorkspace(value: unknown): DirectorWorkspaceValue | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DirectorWorkspaceValue>;
  if (!candidate.result || !Array.isArray(candidate.shots)) return null;
  return candidate as DirectorWorkspaceValue;
}

function newestShotAsset(
  assets: ImageAsset[],
  shotId: string,
) {
  return assets
    .filter((asset) => {
      const reference = asset.metadata?.sourceReference;
      if (reference?.shotId !== shotId) return false;
      return reference.type === "director-shot";
    })
    .sort(
      (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
    )[0];
}

const shotTitles: Record<string, string> = {
  "Attention Shot": "开场钩子",
  "Action Shot": "动作展示",
  "Proof Shot": "产品验证",
  "CTA Shot": "收尾行动",
};

export default function FramePromptWorkspace({
  project,
  request,
  workspace,
  scriptId,
  scriptVersion,
  onNavigate,
  onSelectShot,
  promptOverrides,
  onPromptOverridesChange,
}: {
  project: PersistentProject | null;
  request: DirectorRequest | null;
  workspace: unknown;
  scriptId?: string | number | null;
  scriptVersion: string;
  onNavigate: (view: ActiveView) => void;
  onSelectShot: (index: number) => void;
  promptOverrides: FramePromptOverride[];
  onPromptOverridesChange: (records: FramePromptOverride[]) => void;
}) {
  const director = directorWorkspace(workspace);
  const shots = director?.shots || [];
  const requestedIndex = director?.selectedShot ?? 0;
  const [selected, setSelected] = useState(() =>
    Math.min(Math.max(requestedIndex, 0), Math.max(0, shots.length - 1)),
  );
  const [assets, setAssets] = useState<ImageAsset[]>(readImageAssets);
  const [generationStates, setGenerationStates] = useState<Record<string, FrameGenerationState>>({});
  const [lightbox, setLightbox] = useState<ImageAsset | null>(null);
  const [assistantCollapsed, setAssistantCollapsed] = useState(false);
  const shot = shots[selected] || null;
  const requestRevisionId = request?.scriptRevisionId || (request?.script as { revisionId?: string } | undefined)?.revisionId;
  const requestScriptId = (request?.script as { id?: string | number } | undefined)?.id;
  const legacyScriptIdentity = resolveScriptIdentity(
    requestRevisionId ?? requestScriptId ?? scriptId,
    scriptVersion,
  );
  const directorContextId = director?.result.metadata.contextId?.trim();
  const scriptIdentity = directorContextId
    ? `director:${directorContextId}`
    : legacyScriptIdentity;
  const scriptIdentityAliases = legacyScriptIdentity === scriptIdentity
    ? []
    : [legacyScriptIdentity];

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

  const promptIdentity = project && shot ? { projectId: project.id, scriptIdentity, shotId: shot.shotId } : null;
  const currentOverride = promptIdentity ? findFramePromptOverride(promptOverrides, promptIdentity) : undefined;
  const prompts = automatic ? effectiveFramePrompts(automatic, currentOverride) : null;
  const projectAssets = project
    ? assets.filter((asset) => asset.projectId === project.id)
    : [];
  const previews = Object.fromEntries(
    shots.flatMap((item) => {
      if (!project) return [];
      const asset =
        newestFrameAsset(projectAssets, { projectId: project.id, scriptIdentity, scriptIdentityAliases, scriptVersion, shotId: item.shotId, frameType: "start-frame" }) ||
        newestShotAsset(projectAssets, item.shotId);
      return asset ? [[item.shotId, asset.imageUrl]] : [];
    }),
  );
  const startAsset = shot && project
    ? newestFrameAsset(projectAssets, { projectId: project.id, scriptIdentity, scriptIdentityAliases, scriptVersion, shotId: shot.shotId, frameType: "start-frame" })
    : undefined;
  const endAsset = shot && project
    ? newestFrameAsset(projectAssets, { projectId: project.id, scriptIdentity, scriptIdentityAliases, scriptVersion, shotId: shot.shotId, frameType: "end-frame" })
    : undefined;
  const generationScope = project && shot
    ? `${project.id}:${scriptIdentity}:${shot.shotId}`
    : "";
  const startGeneration = generationStates[`${generationScope}:start-frame`];
  const endGeneration = generationStates[`${generationScope}:end-frame`];

  function chooseShot(index: number) {
    setSelected(index);
    onSelectShot(index);
  }

  function downloadFrame(asset: ImageAsset | undefined, name: string) {
    if (!asset) return;
    const link = document.createElement("a");
    link.href = asset.imageUrl;
    link.download = `${name}.png`;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  }

  function editFramePrompt(id: string) {
    const editor = document.getElementById(id);
    const advanced = editor?.closest("details") as HTMLDetailsElement | null;
    if (advanced) advanced.open = true;
    editor?.scrollIntoView({ behavior: "smooth", block: "center" });
    const button = editor?.querySelector("nav button");
    if (button?.textContent === "编辑") (button as HTMLButtonElement).click();
  }

  function assistantAction(action: "prompt" | "consistency" | "style" | "variants") {
    if (action === "style") { onNavigate("director"); return; }
    if (action === "variants") { if (prompts) openImages(prompts.imagePrompt, "shot-image"); return; }
    document.querySelector(action === "prompt" ? ".vnext-frame-prompt-grid .vnext-frame-prompt-editor" : ".vnext-frame-consistency")?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function updatePrompt(key: FramePromptOverrideKey, value: string) {
    if (!promptIdentity || !automatic) return;
    onPromptOverridesChange(saveFramePromptOverride(promptOverrides, promptIdentity, key, value, automatic[key]));
  }

  function resetPrompt(key: FramePromptOverrideKey) {
    if (!promptIdentity) return;
    onPromptOverridesChange(resetFramePromptOverride(promptOverrides, promptIdentity, key));
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
      scriptIdentity,
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
      returnContext: {
        view: "frames",
        projectId: project.id,
        scriptIdentity,
        scriptVersion,
        shotId: shot.shotId,
        frameType,
      },
    });
    onNavigate("images");
  }

  async function generateFrame(prompt: string, frameType: "start-frame" | "end-frame") {
    if (!project || !request || !shot || !director) return;

    const targetProjectId = project.id;
    const targetShot = shot;
    const targetScriptIdentity = scriptIdentity;
    const targetScriptVersion = scriptVersion;
    const stateKey = `${targetProjectId}:${targetScriptIdentity}:${targetShot.shotId}:${frameType}`;
    if (generationStates[stateKey]?.status === "loading") return;

    const spec = shotImageSpec(
      targetShot,
      request,
      director.result.directorPlan.visualStyle,
      targetProjectId,
    );
    const sourceReference: ImageSourceReference = {
      type: "frame-prompt",
      projectId: targetProjectId,
      scriptIdentity: targetScriptIdentity,
      scriptVersion: targetScriptVersion,
      shotId: targetShot.shotId,
      sourceBlockId: targetShot.sourceBlockId,
      frameType,
      promptType: frameType,
    };

    setGenerationStates((current) => ({
      ...current,
      [stateKey]: { status: "loading", error: "" },
    }));

    try {
      const { asset, persisted } = await generateAndSaveImage({
        request: { ...spec, prompt },
        sourceReference,
        assetIdPrefix: frameType,
      });
      setAssets((current) => [asset, ...current.filter((item) => item.id !== asset.id)]);
      setGenerationStates((current) => ({
        ...current,
        [stateKey]: {
          status: "success",
          error: persisted ? "" : "图片已生成，但浏览器未能保存本地记录。",
        },
      }));
    } catch (caught) {
      const message = caught instanceof ImageGenerationActionError
        ? caught.message
        : "图片生成失败，请稍后重试。";
      setGenerationStates((current) => ({
        ...current,
        [stateKey]: { status: "error", error: message },
      }));
    }
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
          <span>FRAME PROMPT WORKSPACE</span>
          <h1>画面提示词 <small>{project.name} / {scriptVersion} / Shot {String(shot.order).padStart(2, "0")}</small></h1>
        </div>
        <aside>
          <span>{currentOverride ? "已保存自定义提示词" : "AI 默认提示词已准备"}</span>
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
        {[
          ["脚本创作", "Script"],
          ["AI 分镜导演", "Director"],
          ["画面提示词", "Frame Prompt"],
          ["视觉创作", "Images"],
          ["视频生成", "Video"],
        ].map(([label, english], index) => (
          <span key={label} className={index === 2 ? "is-current" : ""} aria-current={index === 2 ? "step" : undefined}>
            <b>{String(index + 1).padStart(2, "0")}</b>
            <span><strong>{label}</strong><small>{english}</small></span>
            {index < 4 ? <i aria-hidden="true">→</i> : null}
          </span>
        ))}
      </nav>

      <div className={`vnext-frame-layout${assistantCollapsed ? " is-assistant-collapsed" : ""}`}>
        <FrameShotNavigator
          shots={shots}
          selected={selected}
          previews={previews}
          onSelect={chooseShot}
        />
        <main className="vnext-frame-canvas">
          <header>
            <div className="vnext-frame-shot-heading">
              <span>SHOT {String(shot.order).padStart(2, "0")}</span>
              <h2 title={shot.visualDescription}>Shot {String(shot.order).padStart(2, "0")} — {shotTitles[shot.shotType] || shot.shotType}</h2>
              <small>{shot.startTime.toFixed(1)}–{shot.endTime.toFixed(1)}s · {shot.framing} · {shot.cameraAngle}</small>
              <p title={shot.visualDescription}>{shot.visualDescription}</p>
            </div>
            <aside><span>{shot.duration.toFixed(1)} 秒</span><button type="button" onClick={() => onNavigate("director")}>编辑分镜</button></aside>
          </header>
          <div className="vnext-frame-pair">
            <FrameCard
              kind="start"
              title="首帧"
              imageUrl={startAsset?.imageUrl}
              generating={startGeneration?.status === "loading"}
              error={startGeneration?.error}
              onGenerate={() => void generateFrame(prompts.startFramePrompt, "start-frame")}
              onOpen={() => startAsset && setLightbox(startAsset)}
              onDownload={() => downloadFrame(startAsset, `shot-${shot.order}-start`)}
              onEdit={() => editFramePrompt("start-frame-prompt")}
            />
            <FrameCard
              kind="end"
              title="尾帧"
              imageUrl={endAsset?.imageUrl}
              generating={endGeneration?.status === "loading"}
              error={endGeneration?.error}
              onGenerate={() => void generateFrame(prompts.endFramePrompt, "end-frame")}
              onOpen={() => endAsset && setLightbox(endAsset)}
              onDownload={() => downloadFrame(endAsset, `shot-${shot.order}-end`)}
              onEdit={() => editFramePrompt("end-frame-prompt")}
            />
          </div>
          <div className="vnext-frame-motion" title={prompts.motionBridge}>
            <span className="vnext-frame-motion-flow"><b>START FRAME</b><i>→</i><strong>镜头动作</strong><i>→</i><b>END FRAME</b></span>
            <div><small>ACTION SUMMARY</small><span className="vnext-frame-motion-copy">{prompts.motionBridge}</span></div>
          </div>
          <section className="vnext-frame-production-actions" aria-label="镜头生成准备状态">
            <div className="vnext-frame-readiness">
              <span><b>首帧</b><em className={startAsset ? "is-ready" : ""}>{startAsset ? "已就绪" : "未生成"}</em></span>
              <span><b>尾帧</b><em className={endAsset ? "is-ready" : ""}>{endAsset ? "已就绪" : "未生成"}</em></span>
              <span><b>镜头动作</b><em className="is-ready">已就绪</em></span>
              <span><b>视频模型</b><em>暂不可用</em></span>
            </div>
            <div className="vnext-frame-video-action">
              <button type="button" disabled title="Seedance 2.5 当前尚未开通">生成视频</button>
              <small>视频模型尚未开通</small>
            </div>
          </section>

          <details className="vnext-frame-advanced">
            <summary><span>高级生成设置</span><small>提示词、一致性规则与负面约束</small></summary>
            <div className="vnext-frame-advanced-list">
              <PromptEditor key={`${shot.shotId}-start`} id="start-frame-prompt" label="START FRAME PROMPT" value={prompts.startFramePrompt} automaticValue={automatic.startFramePrompt} hasOverride={Boolean(currentOverride?.startFramePrompt)} onChange={(value) => updatePrompt("startFramePrompt", value)} onReset={() => resetPrompt("startFramePrompt")} />
              <PromptEditor key={`${shot.shotId}-end`} id="end-frame-prompt" label="END FRAME PROMPT" value={prompts.endFramePrompt} automaticValue={automatic.endFramePrompt} hasOverride={Boolean(currentOverride?.endFramePrompt)} onChange={(value) => updatePrompt("endFramePrompt", value)} onReset={() => resetPrompt("endFramePrompt")} />
              <div className="vnext-frame-prompt-cell">
                <PromptEditor key={`${shot.shotId}-video`} label="VIDEO PROMPT" value={prompts.videoPrompt} automaticValue={automatic.videoPrompt} hasOverride={Boolean(currentOverride?.videoPrompt)} onChange={(value) => updatePrompt("videoPrompt", value)} onReset={() => resetPrompt("videoPrompt")} />
              </div>
              <div className="vnext-frame-prompt-cell">
                <PromptEditor key={`${shot.shotId}-image`} label="IMAGE PROMPT" value={prompts.imagePrompt} automaticValue={automatic.imagePrompt} hasOverride={Boolean(currentOverride?.imagePrompt)} onChange={(value) => updatePrompt("imagePrompt", value)} onReset={() => resetPrompt("imagePrompt")} />
                <button type="button" className="vnext-frame-generate-shot" onClick={() => openImages(prompts.imagePrompt, "shot-image")}>生成镜头参考图 →</button>
              </div>
              <details className="vnext-frame-consistency">
                <summary><span><b>一致性规则</b><small>{Object.values(prompts.consistencyRules).reduce((count, rules) => count + rules.length, 0)} 条规则</small></span><em>查看</em></summary>
                <div>
                  {Object.entries(prompts.consistencyRules).map(([key, rules]) => (
                    <section key={key}>
                      <h3>{key.toUpperCase()}</h3>
                      <ul className="vnext-frame-rule-chips">{rules.map((rule) => <li key={rule}>{rule}</li>)}</ul>
                    </section>
                  ))}
                </div>
              </details>
              <section className="vnext-frame-negative">
                <PromptEditor key={`${shot.shotId}-negative`} label="NEGATIVE PROMPT" value={prompts.negativePrompt} automaticValue={automatic.negativePrompt} hasOverride={Boolean(currentOverride?.negativePrompt)} onChange={(value) => updatePrompt("negativePrompt", value)} onReset={() => resetPrompt("negativePrompt")} compact />
              </section>
            </div>
          </details>
        </main>
        <VisualAssistant key={shot.shotId} shot={shot} request={request} prompts={prompts} referenceImages={projectAssets} collapsed={assistantCollapsed} onToggle={() => setAssistantCollapsed((current) => !current)} onAction={assistantAction} onInstruction={(instruction) => updatePrompt("imagePrompt", `${prompts.imagePrompt}\n${instruction}`)} />
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
