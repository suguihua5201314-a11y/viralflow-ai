"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { readImageAssets, saveImageAssets, saveImageStudioDraft, type ImageAsset } from "./image-assets";
import { shotImageSpec, validGeneratedImageUrl } from "./director-image";
import type { DirectorRequest } from "./director-core";
import type { WorkspaceShot } from "./director-workspace";
import { notifyWorkspace } from "./components/ui/workspace-feedback";

type ImageStatus = "idle" | "loading" | "success" | "error";
type GeneratedImage = Pick<ImageAsset, "provider" | "model" | "imageUrl" | "createdAt" | "metadata">;
type ApiResult = { image?: GeneratedImage; error?: { type?: string; message?: string; retryable?: boolean } };

export default function DirectorShotImage({ shot, input, visualStyle, projectId, onNavigate }: { shot: WorkspaceShot; input: DirectorRequest; visualStyle: string; projectId: string | null; onNavigate?: () => void }) {
  const [status, setStatus] = useState<ImageStatus>("idle");
  const [asset, setAsset] = useState<ImageAsset | null>(null);
  const [error, setError] = useState("");
  const [showLarge, setShowLarge] = useState(false);
  const spec = projectId ? shotImageSpec(shot, input, visualStyle, projectId) : null;

  useEffect(() => {
    if (!projectId) return;
    const timer = window.setTimeout(() => {
      const existing = readImageAssets().find(item => item.projectId === projectId && item.metadata?.sourceReference?.type === "director-shot" && item.metadata.sourceReference.shotId === shot.shotId);
      if (existing) { setAsset(existing); setStatus("success"); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [projectId, shot.shotId]);

  async function generateImage() {
    if (!spec || status === "loading") return;
    setStatus("loading"); setError("");
    try {
      const response = await fetch("/api/images/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(spec) });
      const data = await response.json() as ApiResult;
      if (!response.ok || !data.image) throw new Error(data.error?.message || "镜头图片生成失败，请稍后重试。");
      if (!validGeneratedImageUrl(data.image.imageUrl)) throw new Error("图片服务返回了无效地址，请重新生成。");
      const nextAsset: ImageAsset = {
        id: `director-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...spec,
        provider: data.image.provider,
        model: data.image.model,
        imageUrl: data.image.imageUrl,
        createdAt: data.image.createdAt,
        metadata: { size: data.image.metadata?.size || spec.ratio, requestId: data.image.metadata?.requestId, sourceReference: { type: "director-shot", shotId: shot.shotId, sourceBlockId: shot.sourceBlockId } },
      };
      const saved = saveImageAssets([nextAsset, ...readImageAssets()]);
      setAsset(nextAsset); setStatus("success");
      if (!saved) setError("图片已生成，但浏览器资产存储失败；请先下载图片。");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "镜头图片生成失败，请稍后重试。");
      setStatus("error");
    }
  }

  function saveAsset() {
    if (!asset) return;
    const existing = readImageAssets();
    const saved = saveImageAssets([asset, ...existing.filter(item => item.id !== asset.id)]);
    if (saved) notifyWorkspace("镜头图片已保存", { detail: `已关联 ${shot.shotId}` });
    else setError("保存图片资产失败，请检查浏览器存储空间。");
  }

  function openImageStudio() {
    if (!spec) return;
    saveImageStudioDraft({ ...spec, sourceReference: { type: "director-shot", shotId: shot.shotId, sourceBlockId: shot.sourceBlockId } });
    onNavigate?.();
  }

  const buttonLabel = status === "loading" ? "正在生成..." : status === "success" ? "已生成" : status === "error" ? "生成失败 · 重试" : "生成镜头图片";
  return <section className="os-shot-image-panel" aria-label={`镜头 ${shot.order} 图片生成`}>
    <header><div><span>SHOT IMAGE</span><b>分镜图片</b></div><button className="vf-button vf-button-card" type="button" aria-busy={status === "loading"} disabled={!projectId || status === "loading"} onClick={() => void generateImage()}>{status === "loading" ? <i className="os-image-spinner" /> : null}{buttonLabel}</button></header>
    {asset ? <div className="os-shot-image-result"><button type="button" className="os-shot-image-preview" onClick={() => setShowLarge(true)} aria-label="查看镜头大图"><Image src={asset.imageUrl} alt={asset.prompt} fill sizes="(max-width: 980px) 100vw, 600px" unoptimized /></button><div className="os-shot-image-details"><details><summary>图片提示词</summary><p>{asset.prompt}</p></details><small>{asset.model} · {new Date(asset.createdAt).toLocaleString("zh-CN")}</small><nav aria-label="镜头图片操作"><button type="button" onClick={() => setShowLarge(true)}>查看大图</button><button type="button" disabled={status === "loading"} onClick={() => void generateImage()}>重新生成</button><button type="button" onClick={saveAsset}>保存到图片资产</button><button type="button" onClick={openImageStudio}>前往 AI 图片创作工作台</button></nav></div></div> : <div className="os-shot-image-empty"><h3>当前分镜尚无图片</h3><p>生成分镜图片，或前往图片工作台继续创作。</p><details><summary>查看图片提示词</summary><p>{spec?.prompt || "当前 Director 尚未关联项目，无法保存镜头图片。"}</p></details><button className="vf-button vf-button-secondary" type="button" disabled={!projectId} onClick={openImageStudio}>前往 AI 图片创作工作台继续编辑</button></div>}
    {error ? <div className="os-shot-image-error" role="alert"><b>当前镜头图片未完成</b><p>{error}</p>{status === "error" ? <button type="button" onClick={() => void generateImage()}>重试当前镜头</button> : null}</div> : null}
    {showLarge && asset ? <div className="os-shot-image-lightbox" role="dialog" aria-modal="true" aria-label="查看镜头图片"><button type="button" aria-label="关闭大图" onClick={() => setShowLarge(false)}>×</button><Image src={asset.imageUrl} alt={asset.prompt} fill sizes="95vw" unoptimized /></div> : null}
  </section>;
}
