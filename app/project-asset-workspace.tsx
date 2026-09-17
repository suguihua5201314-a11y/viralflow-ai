"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  IMAGE_ASSET_LIMIT,
  assetsForProject,
  currentDirectorAssetIds,
  imageAssetSource,
  readImageAssets,
  saveImageAssets,
  saveImageStudioDraft,
  takeImageStudioDraft,
  type ImageAsset,
  type ImageSourceReference,
} from "./image-assets";
import type { ImageGenerationRequest, ImageProviderId, ImageProviderStatus } from "./image-provider-router";
import type { ActiveView } from "./navigation";

type ProjectOption = { id: string; name: string; product: string };
type WorkspaceMode = "images" | "assets";
type StudioStatus = "idle" | "loading" | "success" | "error";
type AssetTab = "all" | "images" | "references" | "voice" | "video";
type ApiError = { type: string; message: string; retryable?: boolean };
type ProviderState = { activeProvider: ImageProviderId; providers: ImageProviderStatus[] };

const imageTypes: Array<{ value: ImageGenerationRequest["imageType"]; label: string }> = [
  { value: "Product Image", label: "产品图" },
  { value: "UGC Creator", label: "UGC" },
  { value: "TikTok Ad Creative", label: "广告素材" },
  { value: "Lifestyle Scene", label: "生活场景" },
];
const styles: Array<{ value: ImageGenerationRequest["style"]; label: string }> = [
  { value: "Realistic", label: "真实摄影" }, { value: "UGC", label: "UGC 原生" }, { value: "Premium", label: "高端商业" },
  { value: "Cinematic", label: "电影质感" }, { value: "E-commerce", label: "电商视觉" },
];
const cameras: Array<{ value: ImageGenerationRequest["camera"]; label: string }> = [
  { value: "Close Up", label: "特写" }, { value: "Macro", label: "微距" }, { value: "Wide Shot", label: "广角" }, { value: "Handheld", label: "手持" },
];
const ratios: ImageGenerationRequest["ratio"][] = ["9:16", "1:1", "16:9"];
const tabs: Array<{ id: AssetTab; label: string }> = [
  { id: "all", label: "All" }, { id: "images", label: "Images" }, { id: "references", label: "References" },
  { id: "voice", label: "Voice" }, { id: "video", label: "Video" },
];

function newestFirst(left: ImageAsset, right: ImageAsset) { return Date.parse(right.createdAt) - Date.parse(left.createdAt); }
function shortPrompt(value: string) { return value.length > 92 ? `${value.slice(0, 92)}…` : value; }
function assetShot(asset: ImageAsset) { return asset.metadata?.sourceReference?.shotId || "—"; }
function withinCreatedTime(asset: ImageAsset, value: string) {
  if (value === "all") return true;
  const days = Number(value);
  return Date.parse(asset.createdAt) >= Date.now() - days * 86400000;
}

export default function ProjectAssetWorkspace({ mode, projects, currentProjectId, onNavigate }: {
  mode: WorkspaceMode;
  projects: ProjectOption[];
  currentProjectId: string | null;
  onNavigate: (view: ActiveView) => void;
}) {
  const [assets, setAssets] = useState<ImageAsset[]>(readImageAssets);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [tab, setTab] = useState<AssetTab>("all");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [shotFilter, setShotFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [prompt, setPrompt] = useState("");
  const [imageType, setImageType] = useState<ImageGenerationRequest["imageType"]>("Product Image");
  const [style, setStyle] = useState<ImageGenerationRequest["style"]>("Realistic");
  const [camera, setCamera] = useState<ImageGenerationRequest["camera"]>("Close Up");
  const [ratio, setRatio] = useState<ImageGenerationRequest["ratio"]>("9:16");
  const [sourceReference, setSourceReference] = useState<ImageSourceReference | null>(null);
  const [status, setStatus] = useState<StudioStatus>("idle");
  const [error, setError] = useState<ApiError | null>(null);
  const [providerState, setProviderState] = useState<ProviderState>({ activeProvider: "doubao-image", providers: [] });
  const [selectedProvider, setSelectedProvider] = useState<ImageProviderId>("doubao-image");
  const [showLarge, setShowLarge] = useState(false);
  const [copied, setCopied] = useState(false);

  const project = projects.find(item => item.id === currentProjectId) || null;
  const projectAssets = useMemo(() => assetsForProject(assets, currentProjectId).sort(newestFirst), [assets, currentProjectId]);
  const currentIds = useMemo(() => currentDirectorAssetIds(projectAssets), [projectAssets]);
  const shotOptions = useMemo(() => [...new Set(projectAssets.map(assetShot).filter(value => value !== "—"))], [projectAssets]);
  const modelOptions = useMemo(() => [...new Set(projectAssets.map(asset => asset.model).filter(Boolean))], [projectAssets]);
  const visibleAssets = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return projectAssets.filter(asset => {
      const source = imageAssetSource(asset);
      if (mode === "assets" && tab === "references" && !asset.metadata?.sourceReference) return false;
      if (sourceFilter !== "all" && source !== sourceFilter) return false;
      if (shotFilter !== "all" && assetShot(asset) !== shotFilter) return false;
      if (modelFilter !== "all" && asset.model !== modelFilter) return false;
      if (!withinCreatedTime(asset, timeFilter)) return false;
      return !query || `${asset.prompt} ${assetShot(asset)} ${source}`.toLocaleLowerCase().includes(query);
    });
  }, [mode, modelFilter, projectAssets, search, shotFilter, sourceFilter, tab, timeFilter]);
  const specialTab = mode === "assets" && (tab === "voice" || tab === "video");
  const selectedAsset = specialTab ? null : visibleAssets.find(asset => asset.id === selectedAssetId) || visibleAssets[0] || null;
  const selectedProviderState = providerState.providers.find(item => item.id === selectedProvider);

  useEffect(() => {
    const stored = readImageAssets();
    const nextProjectAssets = assetsForProject(stored, currentProjectId).sort(newestFirst);
    setAssets(stored);
    setSelectedAssetId(current => nextProjectAssets.some(asset => asset.id === current) ? current : nextProjectAssets[0]?.id || null);
    setSearch(""); setSourceFilter("all"); setShotFilter("all"); setModelFilter("all"); setTimeFilter("all");
    if (mode === "images") {
      setPrompt(""); setSourceReference(null); setStatus("idle"); setError(null);
      const draft = takeImageStudioDraft();
      if (draft?.projectId === currentProjectId) {
        setPrompt(draft.prompt); setImageType(draft.imageType); setStyle(draft.style); setCamera(draft.camera); setRatio(draft.ratio);
        setSourceReference(draft.sourceReference || null); setStatus("idle"); setError(null);
      }
    }
  }, [currentProjectId, mode]);

  useEffect(() => {
    fetch("/api/images/generate", { cache: "no-store" }).then(response => response.json()).then(data => {
      const providers = Array.isArray(data.providers) ? data.providers : [];
      const activeProvider = data.activeProvider === "openai-image" ? "openai-image" : "doubao-image";
      setProviderState({ activeProvider, providers }); setSelectedProvider(activeProvider);
    }).catch(() => setProviderState({ activeProvider: "doubao-image", providers: [] }));
  }, []);

  async function generateImage(promptOverride?: string, referenceOverride?: ImageSourceReference | null, settingsOverride?: Pick<ImageAsset, "imageType" | "style" | "camera" | "ratio" | "provider">) {
    const requestedPrompt = promptOverride?.trim() || prompt.trim();
    const preservedReference = referenceOverride === undefined ? sourceReference : referenceOverride;
    const generation = settingsOverride || { imageType, style, camera, ratio, provider: selectedProvider };
    if (!requestedPrompt || !currentProjectId || status === "loading") return;
    setStatus("loading"); setError(null);
    try {
      const response = await fetch("/api/images/generate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: requestedPrompt, imageType: generation.imageType, style: generation.style, camera: generation.camera, ratio: generation.ratio, model: generation.provider, projectId: currentProjectId }),
      });
      const data = await response.json() as { image?: Pick<ImageAsset, "provider" | "model" | "imageUrl" | "createdAt" | "metadata">; error?: ApiError };
      if (!response.ok || !data.image) throw data.error || { type: "provider_error", message: "图片生成失败，请稍后重试。", retryable: true };
      const asset: ImageAsset = {
        id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt: requestedPrompt, imageType: generation.imageType, style: generation.style, camera: generation.camera, ratio: generation.ratio, projectId: currentProjectId,
        ...data.image,
        metadata: { size: data.image.metadata?.size || generation.ratio, requestId: data.image.metadata?.requestId, ...(preservedReference ? { sourceReference: preservedReference } : {}) },
      };
      const next = [asset, ...readImageAssets().filter(item => item.id !== asset.id)].slice(0, IMAGE_ASSET_LIMIT);
      setAssets(next); setSelectedAssetId(asset.id); setSourceReference(preservedReference); setStatus("success");
      if (!saveImageAssets(next)) setError({ type: "storage_full", message: "图片已生成，但浏览器存储空间不足，刷新后记录可能无法保留。", retryable: false });
    } catch (caught) {
      const failure = caught && typeof caught === "object" && "message" in caught ? caught as ApiError : { type: "provider_error", message: "图片生成暂时中断，请稍后重试。", retryable: true };
      setError(failure); setStatus("error");
    }
  }

  function usePrompt(asset: ImageAsset) {
    if (mode === "assets") {
      saveImageStudioDraft({ projectId: asset.projectId, prompt: asset.prompt, imageType: asset.imageType, style: asset.style, camera: asset.camera, ratio: asset.ratio, sourceReference: asset.metadata?.sourceReference });
      onNavigate("images");
      return;
    }
    setPrompt(asset.prompt); setImageType(asset.imageType); setStyle(asset.style); setCamera(asset.camera); setRatio(asset.ratio);
    setSelectedProvider(asset.provider); setSourceReference(asset.metadata?.sourceReference || null); setStatus("idle"); setError(null);
  }

  async function copyPrompt(asset: ImageAsset) {
    try { await navigator.clipboard.writeText(asset.prompt); setCopied(true); window.setTimeout(() => setCopied(false), 1500); }
    catch { setCopied(false); }
  }

  return <section className={`project-asset-workspace ${mode}`} data-project-id={currentProjectId || "none"}>
    <header className="paw-heading">
      <div><span>{mode === "images" ? "IMAGES CREATIVE BOARD" : "PROJECT ASSET LIBRARY"}</span><h2>{mode === "images" ? "Images Creative Board" : "Project Asset Library"}</h2><p>{project ? `${project.name} · ${project.product}` : "请先选择当前项目"}</p></div>
      <div className="paw-project-context"><small>CURRENT PROJECT</small><b>{project?.name || "No Project"}</b><span>{projectAssets.length} image assets</span></div>
    </header>

    {mode === "assets" && <nav className="paw-tabs" aria-label="Asset 类型">{tabs.map(item => <button type="button" className={tab === item.id ? "active" : ""} key={item.id} onClick={() => { setTab(item.id); setSelectedAssetId(null); }}>{item.label}</button>)}</nav>}

    <div className="paw-layout">
      <main className="paw-board">
        {!specialTab && <div className="paw-toolbar">
          <label className="paw-search"><span>⌕</span><input aria-label="搜索资产" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索 Prompt、Shot ID、Source" /></label>
          <select aria-label="Source 筛选" value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}><option value="all">All Sources</option><option>Director Shot</option><option>AI 图片创作</option></select>
          <select aria-label="Shot 筛选" value={shotFilter} onChange={event => setShotFilter(event.target.value)}><option value="all">All Shots</option>{shotOptions.map(value => <option key={value}>{value}</option>)}</select>
          <select aria-label="Model 筛选" value={modelFilter} onChange={event => setModelFilter(event.target.value)}><option value="all">All Models</option>{modelOptions.map(value => <option key={value}>{value}</option>)}</select>
          <select aria-label="Created Time 筛选" value={timeFilter} onChange={event => setTimeFilter(event.target.value)}><option value="all">All Time</option><option value="1">24 Hours</option><option value="7">7 Days</option><option value="30">30 Days</option></select>
        </div>}

        {specialTab ? <div className="paw-special-empty">
          <span>{tab === "voice" ? "♫" : "▶"}</span><h3>{tab === "voice" ? "Voice Studio 已保留" : "Video Assets · Future"}</h3>
          <p>{tab === "voice" ? "继续使用现有多语言语音能力，本阶段不改动 Voice Engine。" : "当前项目还没有真实的视频资产 Store，本阶段不创建模拟数据。"}</p>
          {tab === "voice" && <button type="button" onClick={() => onNavigate("voice")}>进入 Voice Studio</button>}
        </div> : visibleAssets.length ? <div className="paw-grid">
          {visibleAssets.map(asset => {
            const reference = asset.metadata?.sourceReference;
            return <button type="button" className={`paw-card ${selectedAsset?.id === asset.id ? "selected" : ""}`} key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>
              <div className="paw-card-image"><Image src={asset.imageUrl} alt={asset.prompt} fill sizes="(max-width: 900px) 50vw, 260px" unoptimized />{currentIds.has(asset.id) && <em>Current</em>}</div>
              <div className="paw-card-body"><div><span className={reference ? "director" : "studio"}>{imageAssetSource(asset)}</span><small>{reference?.shotId || "No Shot"}</small></div><p>{shortPrompt(asset.prompt)}</p><dl><div><dt>Model</dt><dd>{asset.model}</dd></div><div><dt>Provider</dt><dd>{asset.provider}</dd></div></dl><time>{new Date(asset.createdAt).toLocaleString("zh-CN")}</time></div>
            </button>;
          })}
        </div> : <div className="paw-empty"><span>▧</span><h3>{projectAssets.length ? "没有符合条件的资产" : "当前项目还没有图片资产"}</h3><p>{projectAssets.length ? "调整搜索或筛选条件查看其他真实资产。" : "从 Director Shot 或右侧 Image Composer 创建第一张图片。"}</p></div>}
      </main>

      <aside className="paw-side">
        <section className="paw-inspector">
          <header><div><span>ASSET INSPECTOR</span><h3>Asset Inspector</h3></div>{selectedAsset && <small>{selectedAsset.id}</small>}</header>
          {selectedAsset ? <>
            <button className="paw-inspector-image" type="button" onClick={() => setShowLarge(true)}><Image src={selectedAsset.imageUrl} alt={selectedAsset.prompt} fill sizes="360px" unoptimized /><span>View Large ↗</span></button>
            <div className="paw-prompt"><span>PROMPT</span><p>{selectedAsset.prompt}</p></div>
            <dl className="paw-metadata">
              <div><dt>Model</dt><dd>{selectedAsset.model}</dd></div><div><dt>Provider</dt><dd>{selectedAsset.provider}</dd></div>
              <div><dt>Ratio</dt><dd>{selectedAsset.ratio}</dd></div><div><dt>Style</dt><dd>{selectedAsset.style}</dd></div>
              <div><dt>Camera</dt><dd>{selectedAsset.camera}</dd></div><div><dt>Created At</dt><dd>{new Date(selectedAsset.createdAt).toLocaleString("zh-CN")}</dd></div>
              <div><dt>Project</dt><dd>{project?.name || selectedAsset.projectId}</dd></div><div><dt>Source</dt><dd>{imageAssetSource(selectedAsset)}</dd></div>
              <div><dt>Shot ID</dt><dd>{selectedAsset.metadata?.sourceReference?.shotId || "—"}</dd></div><div><dt>Source Block ID</dt><dd>{selectedAsset.metadata?.sourceReference?.sourceBlockId || "—"}</dd></div>
              <div><dt>Request ID</dt><dd>{selectedAsset.metadata?.requestId || "—"}</dd></div>
            </dl>
            <div className="paw-actions"><button type="button" onClick={() => setShowLarge(true)}>View Large</button><button type="button" onClick={() => void copyPrompt(selectedAsset)}>{copied ? "Copied ✓" : "Copy Prompt"}</button><button type="button" onClick={() => usePrompt(selectedAsset)}>Use Prompt</button>{mode === "images" && <button type="button" disabled={status === "loading"} onClick={() => { usePrompt(selectedAsset); void generateImage(selectedAsset.prompt, selectedAsset.metadata?.sourceReference || null, selectedAsset); }}>Regenerate</button>}{selectedAsset.metadata?.sourceReference && <button type="button" onClick={() => onNavigate("director")}>Go to Director Shot</button>}</div>
          </> : <div className="paw-inspector-empty"><span>◎</span><p>选择一张资产查看完整 metadata 与复用操作。</p></div>}
        </section>

        {mode === "images" && <section className="paw-composer">
          <header><span>LIGHTWEIGHT COMPOSER</span><h3>Image Composer</h3><p>{project ? `Project · ${project.name}` : "No active project"}</p></header>
          {sourceReference && <div className="paw-shot-context"><div><span>SHOT CONTEXT</span><b>{sourceReference.shotId}</b><small>{sourceReference.sourceBlockId}</small></div><button type="button" onClick={() => setSourceReference(null)}>清除</button></div>}
          <label>Prompt<textarea aria-label="图片描述" rows={5} maxLength={2000} value={prompt} onChange={event => { setPrompt(event.target.value); setStatus("idle"); setError(null); }} placeholder="描述主体、场景、光线、构图与商业氛围…" /><small>{prompt.length} / 2000</small></label>
          <div className="paw-composer-row"><label>Type<select value={imageType} onChange={event => setImageType(event.target.value as typeof imageType)}>{imageTypes.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label>Model<select aria-label="图片模型" value={selectedProvider} onChange={event => setSelectedProvider(event.target.value as ImageProviderId)}>{providerState.providers.length ? providerState.providers.map(item => <option value={item.id} key={item.id} disabled={!item.configured}>{item.label}{item.configured ? "" : "（未配置）"}</option>) : <option value="doubao-image">豆包图片模型</option>}</select></label></div>
          <div className="paw-composer-row"><label>Style<select value={style} onChange={event => setStyle(event.target.value as typeof style)}>{styles.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label>Camera<select value={camera} onChange={event => setCamera(event.target.value as typeof camera)}>{cameras.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label></div>
          <fieldset><legend>Ratio</legend>{ratios.map(value => <button type="button" className={ratio === value ? "active" : ""} key={value} onClick={() => setRatio(value)}>{value}</button>)}</fieldset>
          <button className="paw-generate" type="button" disabled={!prompt.trim() || !currentProjectId || status === "loading" || !selectedProviderState?.configured} onClick={() => void generateImage()}>{status === "loading" ? <><i className="image-spinner" /> Generating...</> : status === "success" ? "Generated ✓" : status === "error" ? "Retry Generation ↻" : "Generate Image ↗"}</button>
          {!selectedProviderState?.configured && <p className="paw-config-hint">图片模型尚未配置或状态仍在读取。</p>}
          {error && <div className="paw-error" role="alert"><b>{status === "error" ? "生成失败" : "保存提醒"}</b><p>{error.message}</p>{error.retryable && <button type="button" onClick={() => void generateImage()}>Retry</button>}</div>}
        </section>}
      </aside>
    </div>

    {showLarge && selectedAsset && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="查看生成图片"><button type="button" aria-label="关闭大图" onClick={() => setShowLarge(false)}>×</button><Image src={selectedAsset.imageUrl} alt={selectedAsset.prompt} fill sizes="95vw" unoptimized /></div>}
  </section>;
}
