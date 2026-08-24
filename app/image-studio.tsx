"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { assetsForProject, readImageAssets, saveImageAssets, type ImageAsset } from "./image-assets";
import type { ImageGenerationRequest, ImageProviderId, ImageProviderStatus } from "./image-provider-router";

type ProjectOption = { id: string; name: string; product: string };
type StudioStatus = "idle" | "loading" | "success" | "error";
type ProviderState = { activeProvider: ImageProviderId; providers: ImageProviderStatus[] };
type ApiError = { type: string; message: string; retryable?: boolean };
const imageTypes: Array<{ value: ImageGenerationRequest["imageType"]; label: string }> = [
  { value: "Product Image", label: "产品展示图" }, { value: "UGC Creator", label: "UGC 达人场景" },
  { value: "TikTok Ad Creative", label: "TikTok 广告素材" }, { value: "Lifestyle Scene", label: "生活场景" },
];
const styles: Array<{ value: ImageGenerationRequest["style"]; label: string }> = [
  { value: "Realistic", label: "真实摄影" }, { value: "UGC", label: "用户真实内容风格" }, { value: "Premium", label: "高端商业" },
  { value: "Cinematic", label: "电影质感" }, { value: "E-commerce", label: "电商视觉" },
];
const cameras: Array<{ value: ImageGenerationRequest["camera"]; label: string }> = [
  { value: "Close Up", label: "特写" }, { value: "Macro", label: "微距" }, { value: "Wide Shot", label: "广角" }, { value: "Handheld", label: "手持拍摄" },
];
const ratios: Array<{ value: ImageGenerationRequest["ratio"]; label: string }> = [
  { value: "9:16", label: "9:16 短视频" }, { value: "1:1", label: "商品方图" }, { value: "16:9", label: "横版素材" },
];
const labelFor = <T extends string>(options: Array<{ value: T; label: string }>, value: T) => options.find(item => item.value === value)?.label || value;

export default function ImageStudio({ projects, currentProjectId }: { projects: ProjectOption[]; currentProjectId: string | null }) {
  const fallbackProject = currentProjectId || projects[0]?.id || "";
  const [projectId, setProjectId] = useState(fallbackProject);
  const [prompt, setPrompt] = useState("");
  const [imageType, setImageType] = useState<ImageGenerationRequest["imageType"]>("Product Image");
  const [style, setStyle] = useState<ImageGenerationRequest["style"]>("Realistic");
  const [camera, setCamera] = useState<ImageGenerationRequest["camera"]>("Close Up");
  const [ratio, setRatio] = useState<ImageGenerationRequest["ratio"]>("9:16");
  const [status, setStatus] = useState<StudioStatus>("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const [providerState, setProviderState] = useState<ProviderState>({ activeProvider: "doubao-image", providers: [] });
  const [selectedProvider, setSelectedProvider] = useState<ImageProviderId>("doubao-image");
  const [assets, setAssets] = useState<ImageAsset[]>(readImageAssets);
  const [currentAssetId, setCurrentAssetId] = useState<string | null>(null);
  const [showLargeImage, setShowLargeImage] = useState(false);
  const history = useMemo(() => assetsForProject(assets, projectId), [assets, projectId]);
  const currentAsset = history.find(asset => asset.id === currentAssetId) || history[0] || null;
  const project = projects.find(item => item.id === projectId);
  const activeProvider = providerState.providers.find(item => item.id === selectedProvider);

  useEffect(() => {
    fetch("/api/images/generate", { cache: "no-store" }).then(response => response.json()).then(data => {
      const providers = Array.isArray(data.providers) ? data.providers : [];
      const activeProvider = data.activeProvider === "openai-image" ? "openai-image" : "doubao-image";
      setProviderState({ activeProvider, providers }); setSelectedProvider(activeProvider);
    }).catch(() => setProviderState({ activeProvider: "doubao-image", providers: [] }));
  }, []);

  async function generateImage(promptOverride?: string) {
    const requestedPrompt = promptOverride?.trim() || prompt.trim();
    if (!requestedPrompt || !projectId || status === "loading") return;
    setStatus("loading"); setError(null);
    try {
      const response = await fetch("/api/images/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: requestedPrompt, imageType, style, camera, ratio, model: selectedProvider, projectId }) });
      const data = await response.json() as { image?: Pick<ImageAsset, "provider" | "model" | "imageUrl" | "createdAt" | "metadata">; error?: ApiError };
      if (!response.ok || !data.image) throw data.error || { type: "provider_error", message: "图片生成失败，请稍后重试。", retryable: true };
      const asset: ImageAsset = { id: `image-${Date.now()}`, prompt: requestedPrompt, imageType, style, camera, ratio, projectId, ...data.image };
      const next = [asset, ...assets].slice(0, 6);
      setAssets(next); setCurrentAssetId(asset.id); setStatus("success");
      if (!saveImageAssets(next)) setError({ type: "storage_full", message: "图片已生成，但浏览器存储空间不足，刷新后记录可能无法保留。", retryable: false });
    } catch (caught) {
      const failure = caught && typeof caught === "object" && "message" in caught ? caught as ApiError : { type: "provider_error", message: "图片生成暂时中断，请稍后重试。", retryable: true };
      setError(failure); setStatus("error");
    }
  }

  return <section className="image-studio" aria-label="AI 图片创作工作台">
    <div className="image-studio-heading">
      <div><span>AI 商业视觉创作</span><h2>AI 图片创作工作台</h2><p>为短视频、电商与广告准备高质量商业视觉素材。</p></div>
      <div className={`image-provider-state ${activeProvider?.configured ? "connected" : ""}`}><i />{activeProvider?.configured ? `豆包图片模型已连接 · ${activeProvider.model}` : "豆包图片模型未配置"}</div>
    </div>
    <div className="image-studio-grid">
      <aside className="image-settings">
        <header><span>01</span><div><h3>图片设置</h3><p>定义视觉目标与生成规格</p></div></header>
        <label>项目<select aria-label="项目" value={projectId} onChange={event => { setProjectId(event.target.value); setStatus("idle"); setCurrentAssetId(null); }}><option value="" disabled>请选择项目</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>图片描述<textarea aria-label="图片描述" rows={7} maxLength={2000} value={prompt} onChange={event => { setPrompt(event.target.value); setStatus("idle"); setError(null); }} placeholder="描述主体、场景、光线、构图与希望呈现的商业氛围，支持多语言输入……" /><small>{prompt.length} / 2000 · 支持多语言</small></label>
        <fieldset><legend>图片类型</legend><div className="image-option-grid">{imageTypes.map(item => <button type="button" className={imageType === item.value ? "selected" : ""} key={item.value} onClick={() => setImageType(item.value)}>{item.label}</button>)}</div></fieldset>
        <label>视觉风格<select aria-label="视觉风格" value={style} onChange={event => setStyle(event.target.value as typeof style)}>{styles.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>镜头类型<select aria-label="镜头类型" value={camera} onChange={event => setCamera(event.target.value as typeof camera)}>{cameras.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label>图片模型<select aria-label="图片模型" value={selectedProvider} onChange={event => { setSelectedProvider(event.target.value as ImageProviderId); setStatus("idle"); }}>
          {providerState.providers.length ? providerState.providers.map(item => <option key={item.id} value={item.id} disabled={!item.configured}>{item.label}{item.configured ? ` · ${item.model}` : "（未配置）"}</option>) : <option value="doubao-image">豆包图片模型</option>}
        </select></label>
        <fieldset><legend>图片比例</legend><div className="ratio-options">{ratios.map(item => <button type="button" className={ratio === item.value ? "selected" : ""} key={item.value} onClick={() => setRatio(item.value)}><span>{item.value}</span><small>{item.label}</small></button>)}</div></fieldset>
        <button className="image-generate" type="button" disabled={!prompt.trim() || !projectId || status === "loading" || !activeProvider?.configured} onClick={() => void generateImage()}>{status === "loading" ? <><span className="image-spinner" />正在生成图片...</> : status === "success" ? <>生成完成 <span>✓</span></> : status === "error" ? <>生成失败，重新生成 <span>↻</span></> : <>生成图片 <span>↗</span></>}</button>
        {!activeProvider?.configured && <p className="image-config-hint">豆包图片模型尚未连接，请联系管理员检查 ARK_API_KEY。</p>}
        {error && <div className="image-error" role="alert"><b>{status === "error" ? "生成失败" : "保存提醒"}</b><p>{error.message}</p>{error.retryable && <button type="button" onClick={() => void generateImage()}>重新生成</button>}</div>}
      </aside>
      <main className="image-canvas">
        <header><div><span>02</span><h3>图片画布</h3></div><em>{labelFor(ratios, ratio)} · {labelFor(styles, style)}</em></header>
        <div className={`canvas-stage ratio-${ratio.replace(":", "-")}`}>
          {status === "loading" ? <div className="canvas-loading"><span className="image-spinner large" /><h3>正在创作商业图片</h3><p>图片生成通常需要几十秒，请保持页面开启。</p></div> : currentAsset ? <><Image className="generated-image" src={currentAsset.imageUrl} alt={currentAsset.prompt} fill sizes="(max-width: 800px) 100vw, 55vw" unoptimized /><div className="canvas-result-actions"><button type="button" onClick={() => setShowLargeImage(true)}>查看大图</button><button type="button" onClick={() => { setPrompt(currentAsset.prompt); void generateImage(currentAsset.prompt); }}>重新生成</button><button type="button" onClick={() => { saveImageAssets(assets); setStatus("success"); }}>保存资产</button><a href={currentAsset.imageUrl} download={`ViralFlow-${currentAsset.id}.jpg`}>下载图片</a></div></> : <><div className="canvas-glow" /><div className="canvas-empty"><span>✦</span><h3>从一个视觉想法开始</h3><p>输入图片描述并选择图片类型、视觉风格、镜头与比例。</p></div></>}
        </div>
        <footer><span><i /> {status === "success" ? "图片已生成并保存" : "真实图片生成"}</span><p>仅生成图片，不调用视频模型。</p></footer>
      </main>
      <aside className="image-history">
        <header><div><span>03</span><h3>生成记录</h3></div><em>{history.length}</em></header>
        <div className="history-project"><small>当前项目</small><b>{project?.name || "未选择项目"}</b><span>{project?.product || "选择项目后查看图片资产"}</span></div>
        {history.length ? <div className="image-history-list">{history.map(asset => <button type="button" className={currentAsset?.id === asset.id ? "selected" : ""} key={asset.id} onClick={() => { setCurrentAssetId(asset.id); setStatus("success"); }}><div className="asset-preview"><Image src={asset.imageUrl} alt={asset.prompt} fill sizes="220px" unoptimized /></div><b>{labelFor(imageTypes, asset.imageType)}</b><p>{asset.prompt}</p><span>{labelFor(styles, asset.style)} · {labelFor(ratios, asset.ratio)}</span><small>{asset.model} · {new Date(asset.createdAt).toLocaleString("zh-CN")}</small></button>)}</div> : <div className="image-history-empty"><span>◫</span><h4>暂无生成图片</h4><p>生成成功后会按当前项目自动归档，并保留描述、类型、风格、比例、模型与时间。</p></div>}
        <footer>{providerState.providers.map(item => <span key={item.id}><i className={item.configured ? "online" : ""} /> {item.label}<em>{item.configured ? "已连接" : "未配置"}</em></span>)}</footer>
      </aside>
    </div>
    {showLargeImage && currentAsset && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="查看生成图片"><button type="button" aria-label="关闭大图" onClick={() => setShowLargeImage(false)}>×</button><Image src={currentAsset.imageUrl} alt={currentAsset.prompt} fill sizes="95vw" unoptimized /></div>}
  </section>;
}
