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
const MAX_PROMPT_LENGTH = 2000;
const tabs: Array<{ id: AssetTab; label: string }> = [
  { id: "all", label: "全部" }, { id: "images", label: "图片" }, { id: "references", label: "参考素材" },
  { id: "voice", label: "声音" }, { id: "video", label: "视频" },
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
    const promptValue = promptOverride ?? prompt;
    const requestedPrompt = promptValue.trim();
    const preservedReference = referenceOverride === undefined ? sourceReference : referenceOverride;
    const generation = settingsOverride || { imageType, style, camera, ratio, provider: selectedProvider };
    if (promptValue.length > MAX_PROMPT_LENGTH) {
      setStatus("error");
      setError({ type: "validation_error", message: `提示词最多支持 ${MAX_PROMPT_LENGTH} 个字符`, retryable: false });
      return;
    }
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
      <div><span>{mode === "images" ? "图片创作" : "项目素材"}</span><h2>{mode === "images" ? "AI图片创作工作台" : "项目素材库"}</h2><p>{project ? `${project.name} · ${project.product}` : "请先选择当前项目"}</p></div>
      <div className="paw-project-context"><small>当前项目</small><b>{project?.name || "未选择项目"}</b><span>{projectAssets.length} 个图片素材</span></div>
    </header>

    {mode === "assets" && <nav className="paw-tabs" aria-label="素材类型">{tabs.map(item => <button type="button" className={tab === item.id ? "active" : ""} key={item.id} onClick={() => { setTab(item.id); setSelectedAssetId(null); }}>{item.label}</button>)}</nav>}

    <div className="paw-layout">
      <main className="paw-board">
        {!specialTab && <div className="paw-toolbar">
          <label className="paw-search"><span>⌕</span><input aria-label="素材搜索" value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索提示词、分镜 ID、来源" /></label>
          <select aria-label="来源筛选" value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}><option value="all">全部来源</option><option>导演分镜</option><option>AI图片创作</option></select>
          <select aria-label="分镜筛选" value={shotFilter} onChange={event => setShotFilter(event.target.value)}><option value="all">全部分镜</option>{shotOptions.map(value => <option key={value}>{value}</option>)}</select>
          <select aria-label="模型筛选" value={modelFilter} onChange={event => setModelFilter(event.target.value)}><option value="all">全部模型</option>{modelOptions.map(value => <option key={value}>{value}</option>)}</select>
          <select aria-label="创建时间筛选" value={timeFilter} onChange={event => setTimeFilter(event.target.value)}><option value="all">全部时间</option><option value="1">最近24小时</option><option value="7">最近7天</option><option value="30">最近30天</option></select>
        </div>}

        {specialTab ? <div className="paw-special-empty">
          <span>{tab === "voice" ? "♫" : "▶"}</span><h3>{tab === "voice" ? "AI配音功能已保留" : "视频功能即将开放"}</h3>
          <p>{tab === "voice" ? "继续使用现有多语言配音能力。" : "当前项目暂无视频素材，后续版本开放。"}</p>
          {tab === "voice" && <button type="button" onClick={() => onNavigate("voice")}>进入AI配音</button>}
        </div> : visibleAssets.length ? <div className="paw-grid">
          {visibleAssets.map(asset => {
            const reference = asset.metadata?.sourceReference;
            return <button type="button" className={`paw-card ${selectedAsset?.id === asset.id ? "selected" : ""}`} key={asset.id} onClick={() => setSelectedAssetId(asset.id)}>
              <div className="paw-card-image"><Image src={asset.imageUrl} alt={asset.prompt} fill sizes="(max-width: 900px) 50vw, 260px" unoptimized />{currentIds.has(asset.id) && <em>当前版本</em>}</div>
              <div className="paw-card-body"><div><span className={reference ? "director" : "studio"}>{imageAssetSource(asset)}</span><small>{reference?.shotId || "未关联分镜"}</small></div><p>{shortPrompt(asset.prompt)}</p><dl><div><dt>模型</dt><dd>{asset.model}</dd></div><div><dt>服务商</dt><dd>{asset.provider}</dd></div></dl><time>{new Date(asset.createdAt).toLocaleString("zh-CN")}</time></div>
            </button>;
          })}
        </div> : <div className="paw-empty"><span>✨</span><h3>{projectAssets.length ? "没有符合条件的素材" : "开始创建视觉素材"}</h3>{projectAssets.length ? <p>调整搜索或筛选条件查看其他真实素材。</p> : <><p>选择适合当前创作流程的方式，建立项目视觉语言。</p><ul><li>从 AI分镜导演生成</li><li>输入提示词生成</li><li>使用参考素材生成</li></ul></>}{!projectAssets.length && <button type="button" onClick={() => onNavigate("images")}>开始生成图片</button>}</div>}
      </main>

      <aside className="paw-side">
        <section className="paw-inspector">
          <header><div><span>创作者面板</span><h3>素材预览</h3></div>{selectedAsset && <small>{selectedAsset.id}</small>}</header>
          {selectedAsset ? <>
            <button className="paw-inspector-image" type="button" onClick={() => setShowLarge(true)}><Image src={selectedAsset.imageUrl} alt={selectedAsset.prompt} fill sizes="360px" unoptimized /><span>查看大图 ↗</span></button>
            <div className="paw-creative-context"><div><span>用途</span><b>{selectedAsset.metadata?.sourceReference?.shotId ? `分镜 ${selectedAsset.metadata.sourceReference.shotId}` : "项目视觉素材"}</b></div><div><span>来源</span><b>{imageAssetSource(selectedAsset)}</b></div></div>
            <div className="paw-prompt"><span>提示词</span><p>{selectedAsset.prompt}</p></div>
            <div className="paw-actions paw-creator-actions">{mode === "images" && <button className="primary" type="button" disabled={status === "loading"} onClick={() => { usePrompt(selectedAsset); void generateImage(selectedAsset.prompt, selectedAsset.metadata?.sourceReference || null, selectedAsset); }}>重新生成</button>}<button type="button" disabled title="视频创作即将开放">生成视频</button><button type="button" onClick={() => void copyPrompt(selectedAsset)}>{copied ? "已复制 ✓" : "复制提示词"}</button></div>
            <details className="paw-advanced-metadata"><summary>高级信息</summary><dl className="paw-metadata">
              <div><dt>模型</dt><dd>{selectedAsset.model}</dd></div><div><dt>服务商</dt><dd>{selectedAsset.provider}</dd></div>
              <div><dt>比例</dt><dd>{selectedAsset.ratio}</dd></div><div><dt>风格</dt><dd>{selectedAsset.style}</dd></div>
              <div><dt>镜头</dt><dd>{selectedAsset.camera}</dd></div><div><dt>创建时间</dt><dd>{new Date(selectedAsset.createdAt).toLocaleString("zh-CN")}</dd></div>
              <div><dt>项目</dt><dd>{project?.name || selectedAsset.projectId}</dd></div><div><dt>来源</dt><dd>{imageAssetSource(selectedAsset)}</dd></div>
              <div><dt>分镜 ID</dt><dd>{selectedAsset.metadata?.sourceReference?.shotId || "—"}</dd></div><div><dt>来源区块 ID</dt><dd>{selectedAsset.metadata?.sourceReference?.sourceBlockId || "—"}</dd></div>
              <div><dt>请求 ID</dt><dd>{selectedAsset.metadata?.requestId || "—"}</dd></div>
            </dl></details>
            <div className="paw-actions paw-secondary-actions"><button type="button" onClick={() => setShowLarge(true)}>查看大图</button><button type="button" onClick={() => usePrompt(selectedAsset)}>使用提示词</button>{selectedAsset.metadata?.sourceReference && <button type="button" onClick={() => onNavigate("director")}>返回导演分镜</button>}</div>
          </> : <div className="paw-inspector-empty"><span>◎</span><p>选择一张素材，查看详情与复用操作。</p></div>}
        </section>

        {mode === "images" && <section className="paw-composer">
          <header><span>轻量图片创作</span><h3>图片生成器</h3><p>{project ? `项目 · ${project.name}` : "当前未选择项目"}</p></header>
          {sourceReference && <div className="paw-shot-context"><div><span>分镜上下文</span><b>{sourceReference.shotId}</b><small>{sourceReference.sourceBlockId}</small></div><button type="button" onClick={() => setSourceReference(null)}>清除</button></div>}
          <label>提示词<textarea aria-label="图片描述" rows={5} maxLength={MAX_PROMPT_LENGTH} value={prompt} onChange={event => { const nextPrompt = event.target.value; const tooLong = nextPrompt.length > MAX_PROMPT_LENGTH; setPrompt(nextPrompt); setStatus(tooLong ? "error" : "idle"); setError(tooLong ? { type: "validation_error", message: `提示词最多支持 ${MAX_PROMPT_LENGTH} 个字符`, retryable: false } : null); }} placeholder="描述主体、场景、光线、构图与商业氛围…" /><small>{prompt.length} / {MAX_PROMPT_LENGTH}</small></label>
          <div className="paw-composer-row"><label>类型<select value={imageType} onChange={event => setImageType(event.target.value as typeof imageType)}>{imageTypes.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label>模型<select aria-label="图片模型" value={selectedProvider} onChange={event => setSelectedProvider(event.target.value as ImageProviderId)}>{providerState.providers.length ? providerState.providers.map(item => <option value={item.id} key={item.id} disabled={!item.configured}>{item.label}{item.configured ? "" : "（未配置）"}</option>) : <option value="doubao-image">豆包图片模型</option>}</select></label></div>
          <div className="paw-composer-row"><label>风格<select value={style} onChange={event => setStyle(event.target.value as typeof style)}>{styles.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label><label>镜头<select value={camera} onChange={event => setCamera(event.target.value as typeof camera)}>{cameras.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label></div>
          <fieldset><legend>比例</legend>{ratios.map(value => <button type="button" className={ratio === value ? "active" : ""} key={value} onClick={() => setRatio(value)}>{value}</button>)}</fieldset>
          <button className="paw-generate" type="button" disabled={!prompt.trim() || prompt.length > MAX_PROMPT_LENGTH || !currentProjectId || status === "loading" || !selectedProviderState?.configured} onClick={() => void generateImage()}>{status === "loading" ? <><i className="image-spinner" /> 生成中...</> : status === "success" ? "生成成功 ✓" : status === "error" ? "重新尝试 ↻" : "生成图片 ↗"}</button>
          {!selectedProviderState?.configured && <p className="paw-config-hint">图片模型尚未配置或状态仍在读取。</p>}
          {error && <div className="paw-error" role="alert"><b>{status === "error" ? "生成失败" : "保存提醒"}</b><p>{error.message}</p>{error.retryable && <button type="button" onClick={() => void generateImage()}>重新尝试</button>}</div>}
        </section>}
      </aside>
    </div>

    {showLarge && selectedAsset && <div className="image-lightbox" role="dialog" aria-modal="true" aria-label="查看生成图片"><button type="button" aria-label="关闭大图" onClick={() => setShowLarge(false)}>×</button><Image src={selectedAsset.imageUrl} alt={selectedAsset.prompt} fill sizes="95vw" unoptimized /></div>}
  </section>;
}
