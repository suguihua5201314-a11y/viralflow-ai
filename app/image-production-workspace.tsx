"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import PromptEditor from "./components/frame-prompt/prompt-editor";
import type { DirectorRequest, DirectorResult } from "./director-core";
import { shotImageSpec } from "./director-image";
import type { WorkspaceShot } from "./director-workspace";
import { buildFramePrompts } from "./frame-prompt";
import { effectiveFramePrompts, findFramePromptOverride, resetFramePromptOverride, saveFramePromptOverride, type FramePromptOverride, type FramePromptOverrideKey } from "./frame-prompt-overrides";
import { generateAndSaveImage, ImageGenerationActionError } from "./image-generation-action";
import { adoptExistingImageAsset, adoptedFrameAsset, frameVariants, imageProductionStatus, nextIncompleteShotIndex, requiredFrameTypes, type ImageProductionStatus } from "./image-production";
import { imageRequestIdentityKey, readImageAssets, resolveScriptIdentity, saveImageAssets, type FrameAssetQuery, type ImageAsset, type ImageFrameType, type ImageSourceReference } from "./image-assets";
import type { ActiveView } from "./navigation";
import type { PersistentProject } from "./project-memory";

type WorkspaceValue = { result: DirectorResult; shots: WorkspaceShot[]; selectedShot?: number | null };
type GenerationState = { status: "idle" | "loading" | "success" | "error"; error: string };
const statusLabel: Record<ImageProductionStatus, string> = { "not-started": "未开始", "in-progress": "制作中", complete: "已完成" };

function readWorkspace(value: unknown): WorkspaceValue | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<WorkspaceValue>;
  return candidate.result && Array.isArray(candidate.shots) ? candidate as WorkspaceValue : null;
}

export default function ImageProductionWorkspace({ project, request, workspace, scriptId, scriptVersion, promptOverrides, onPromptOverridesChange, onNavigate, onSelectShot }: {
  project: PersistentProject | null;
  request: DirectorRequest | null;
  workspace: unknown;
  scriptId?: string | number | null;
  scriptVersion: string;
  promptOverrides: FramePromptOverride[];
  onPromptOverridesChange: (records: FramePromptOverride[]) => void;
  onNavigate: (view: ActiveView) => void;
  onSelectShot: (index: number) => void;
}) {
  const director = readWorkspace(workspace);
  const shots = useMemo(() => director?.shots || [], [director?.shots]);
  const [assets, setAssets] = useState<ImageAsset[]>(readImageAssets);
  const [selected, setSelected] = useState(Math.max(0, director?.selectedShot || 0));
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [generation, setGeneration] = useState<Record<string, GenerationState>>({});
  const [lightbox, setLightbox] = useState<ImageAsset | null>(null);
  const shot = shots[selected] || null;
  const requestRevisionId = request?.scriptRevisionId || (request?.script as { revisionId?: string } | undefined)?.revisionId;
  const requestScriptId = (request?.script as { id?: string | number } | undefined)?.id;
  const legacyIdentity = resolveScriptIdentity(requestRevisionId ?? requestScriptId ?? scriptId, scriptVersion);
  const contextId = director?.result.metadata.contextId?.trim();
  const scriptIdentity = contextId ? `director:${contextId}` : legacyIdentity;
  const aliases = legacyIdentity === scriptIdentity ? [] : [legacyIdentity];

  useEffect(() => { setAssets(readImageAssets()); }, [project?.id, contextId]);
  useEffect(() => {
    const requested = Math.max(0, Math.min(director?.selectedShot || 0, Math.max(0, shots.length - 1)));
    setSelected(requested);
  }, [contextId, director?.selectedShot, shots.length]);

  const bundles = useMemo(() => shots.map((item) => project && request ? buildFramePrompts({ projectId: project.id, projectName: project.name, scriptVersion, visualStyle: director?.result.directorPlan.visualStyle }, request, item) : null), [director?.result.directorPlan.visualStyle, project, request, scriptVersion, shots]);
  const automatic = bundles[selected] || null;
  const promptIdentity = project && shot ? { projectId: project.id, scriptIdentity, shotId: shot.shotId } : null;
  const override = promptIdentity ? findFramePromptOverride(promptOverrides, promptIdentity) : undefined;
  const prompts = automatic ? effectiveFramePrompts(automatic, override) : null;

  function query(item: WorkspaceShot, frameType: ImageFrameType): FrameAssetQuery | null {
    return project ? { projectId: project.id, scriptIdentity, scriptIdentityAliases: aliases, scriptVersion, shotId: item.shotId, frameType } : null;
  }
  const shotStatuses = shots.map((item, index) => {
    const bundle = bundles[index];
    if (!bundle) return "not-started" as const;
    const ready = requiredFrameTypes(bundle).filter((type) => { const q = query(item, type); return q && adoptedFrameAsset(assets, q); });
    return imageProductionStatus(requiredFrameTypes(bundle), ready);
  });
  const currentRequired = prompts ? requiredFrameTypes(prompts) : [];

  function chooseShot(index: number) { setSelected(index); onSelectShot(index); }
  function updatePrompt(key: FramePromptOverrideKey, value: string) {
    if (promptIdentity && automatic) onPromptOverridesChange(saveFramePromptOverride(promptOverrides, promptIdentity, key, value, automatic[key]));
  }
  function resetPrompt(key: FramePromptOverrideKey) {
    if (promptIdentity) onPromptOverridesChange(resetFramePromptOverride(promptOverrides, promptIdentity, key));
  }
  function adopt(asset: ImageAsset) {
    const next = adoptExistingImageAsset(assets, asset.id);
    saveImageAssets(next); setAssets(next);
  }
  async function generateFrame(prompt: string, frameType: "start-frame" | "end-frame") {
    if (!project || !request || !shot || !director) return;
    const stateKey = imageRequestIdentityKey({ projectId: project.id, scriptIdentity, shotId: shot.shotId, frameType });
    if (generation[stateKey]?.status === "loading") return;
    const sourceReference: ImageSourceReference = { type: "frame-prompt", projectId: project.id, scriptIdentity, ...(requestRevisionId ? { sourceScriptRevisionId: requestRevisionId } : {}), scriptVersion, shotId: shot.shotId, sourceBlockId: shot.sourceBlockId, frameType, promptType: frameType };
    const spec = shotImageSpec(shot, request, director.result.directorPlan.visualStyle, project.id);
    setGeneration((current) => ({ ...current, [stateKey]: { status: "loading", error: "" } }));
    try {
      const { asset, persisted } = await generateAndSaveImage({ request: { ...spec, prompt }, sourceReference, assetIdPrefix: frameType });
      const next = [asset, ...readImageAssets().filter((item) => item.id !== asset.id)];
      setAssets(next); setSelectedVariants((current) => ({ ...current, [`${shot.shotId}:${frameType}`]: asset.id }));
      setGeneration((current) => ({ ...current, [stateKey]: { status: "success", error: persisted ? "" : "图片已生成，但浏览器未能保存本地记录。" } }));
    } catch (error) {
      setGeneration((current) => ({ ...current, [stateKey]: { status: "error", error: error instanceof ImageGenerationActionError ? error.message : "图片生成失败，请重试。" } }));
    }
  }

  if (!project || !request || !director || !shots.length || !shot || !prompts) return <section className="image-production-empty"><span>05 图片</span><h1>请先完成当前脚本的镜头设计。</h1><p>图片会跟随当前脚本与导演镜头准备，旧素材仍保留在素材库。</p><button className="vf-button vf-button-primary" onClick={() => onNavigate("director")}>返回导演</button></section>;

  const currentComplete = shotStatuses[selected] === "complete";
  const allComplete = shotStatuses.every((status) => status === "complete");
  const currentAutomatic = automatic!;
  return <section className="image-production-workspace" data-project-id={project.id}>
    <header className="image-production-header"><div><span>05 · 图片</span><h1>镜头画面制作</h1><p>选择镜头，确认首帧和尾帧，然后继续下一镜头。</p></div><nav><button onClick={() => onNavigate("frames")}>高级提示词工作台</button><button onClick={() => onNavigate("assets")}>查看全部素材</button></nav></header>
    <nav className="image-shot-navigation" aria-label="镜头导航">{shots.map((item, index) => <button key={item.shotId} className={index === selected ? "is-current" : ""} aria-current={index === selected ? "step" : undefined} onClick={() => chooseShot(index)}><b>镜头 {String(item.order).padStart(2, "0")}</b><span data-status={shotStatuses[index]}>{statusLabel[shotStatuses[index]]}</span></button>)}</nav>
    <section className="image-shot-summary"><div><span>当前镜头 · {String(shot.order).padStart(2, "0")}</span><h2>{shot.visualDescription}</h2><p>{shot.talentAction || shot.productAction}</p></div><dl><div><dt>时长</dt><dd>{shot.duration.toFixed(1)} 秒</dd></div><div><dt>台词</dt><dd>{shot.dialogue || shot.voiceover || "无台词"}</dd></div><div><dt>产品任务 / Proof</dt><dd>{shot.proofRequirement || shot.productAction || "按导演镜头执行"}</dd></div></dl><button onClick={() => onNavigate("director")}>返回修改镜头</button></section>
    <main className="image-frame-grid">{currentRequired.map((frameType) => {
      const q = query(shot, frameType)!; const variants = frameVariants(assets, q); const adopted = adoptedFrameAsset(assets, q); const selectionKey = `${shot.shotId}:${frameType}`; const active = variants.find((asset) => asset.id === selectedVariants[selectionKey]) || adopted; const key = frameType === "start-frame" ? "startFramePrompt" : "endFramePrompt"; const label = frameType === "start-frame" ? "首帧" : "尾帧"; const stateKey = imageRequestIdentityKey({ projectId: project.id, scriptIdentity, shotId: shot.shotId, frameType }); const state = generation[stateKey];
      return <article className="image-frame-card" key={frameType}><header><div><span>{frameType === "start-frame" ? "START FRAME" : "END FRAME"}</span><h3>{label}</h3></div><strong className={adopted ? "is-adopted" : ""}>{adopted ? "✓ 已采用" : "待生成"}</strong></header>
        <button className="image-frame-preview" disabled={!active} onClick={() => active && setLightbox(active)}>{active ? <Image src={active.imageUrl} alt={`${label}预览`} fill sizes="(max-width: 900px) 90vw, 42vw" unoptimized /> : <span><b>{label}尚未生成</b><small>系统会使用当前导演镜头和中文提示词</small></span>}</button>
        {variants.length > 1 && <div className="image-frame-variants" aria-label={`${label}历史版本`}>{variants.map((asset, index) => <button className={active?.id === asset.id ? "selected" : ""} key={asset.id} onClick={() => setSelectedVariants((current) => ({ ...current, [selectionKey]: asset.id }))}><Image src={asset.imageUrl} alt={`${label}版本 ${index + 1}`} fill sizes="72px" unoptimized /></button>)}</div>}
        <div className="image-frame-actions"><button className="vf-button vf-button-primary" disabled={state?.status === "loading"} onClick={() => void generateFrame(prompts[key], frameType)}>{state?.status === "loading" ? "生成中…" : adopted ? "重新生成" : `生成${label}`}</button>{active && active.id !== adopted?.id && <button onClick={() => adopt(active)}>采用此版本</button>}<button onClick={() => document.getElementById(`${frameType}-production-prompt`)?.scrollIntoView({ behavior: "smooth" })}>查看/编辑提示词</button></div>
        {state?.error && <p className="image-frame-error">{state.error}</p>}
        <details className="image-frame-prompt"><summary>查看提示词</summary><PromptEditor id={`${frameType}-production-prompt`} label={frameType === "start-frame" ? "START FRAME PROMPT" : "END FRAME PROMPT"} value={prompts[key]} automaticValue={currentAutomatic[key]} hasOverride={typeof override?.[key] === "string"} onChange={(value) => updatePrompt(key, value)} onReset={() => resetPrompt(key)} compact /></details>
      </article>;
    })}</main>
    <details className="image-production-advanced"><summary>技术详情</summary><p>中文 canonical prompt 已绑定当前 Project、Script Revision、Director Context、Shot 与 Frame Type。模型、Provider、request ID 和 sourceReference 仅保留在生成与资产记录中。</p><PromptEditor label="NEGATIVE PROMPT" value={prompts.negativePrompt} automaticValue={currentAutomatic.negativePrompt} hasOverride={typeof override?.negativePrompt === "string"} onChange={(value) => updatePrompt("negativePrompt", value)} onReset={() => resetPrompt("negativePrompt")} compact /></details>
    <footer className="image-production-footer">{allComplete ? <div><strong>图片阶段已完成</strong><span>视频阶段暂未开放</span></div> : currentComplete ? <button className="vf-button vf-button-primary" onClick={() => { const next = nextIncompleteShotIndex(shotStatuses, selected); if (next >= 0) chooseShot(next); }}>下一镜头 →</button> : <p>采用当前镜头所需画面后即可继续。</p>}</footer>
    {lightbox && <div className="image-production-lightbox" role="dialog" aria-modal="true"><button aria-label="关闭" onClick={() => setLightbox(null)}>×</button><Image src={lightbox.imageUrl} alt="图片大图" fill sizes="95vw" unoptimized /></div>}
  </section>;
}
