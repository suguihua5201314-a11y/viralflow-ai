"use client";

import { useMemo, useState } from "react";
import { assetsForProject, readImageAssets, type ImageAsset } from "./image-assets";
import { listImageProviders, type ImageGenerationRequest } from "./image-provider-router";

type ProjectOption = { id: string; name: string; product: string };
type StudioStatus = "idle" | "ready";

const imageTypes: ImageGenerationRequest["imageType"][] = ["Product Image", "UGC Creator", "TikTok Ad Creative", "Lifestyle Scene"];
const styles: ImageGenerationRequest["style"][] = ["Realistic", "UGC", "Premium", "Cinematic", "E-commerce"];
const cameras: ImageGenerationRequest["camera"][] = ["Close Up", "Macro", "Wide Shot", "Handheld"];
const ratios: Array<{ value: ImageGenerationRequest["ratio"]; label: string }> = [{ value: "9:16", label: "9:16 TikTok" }, { value: "1:1", label: "1:1" }, { value: "16:9", label: "16:9" }];

export default function ImageStudio({ projects, currentProjectId }: { projects: ProjectOption[]; currentProjectId: string | null }) {
  const fallbackProject = currentProjectId || projects[0]?.id || "";
  const [projectId, setProjectId] = useState(fallbackProject);
  const [prompt, setPrompt] = useState("");
  const [imageType, setImageType] = useState<ImageGenerationRequest["imageType"]>("Product Image");
  const [style, setStyle] = useState<ImageGenerationRequest["style"]>("Realistic");
  const [camera, setCamera] = useState<ImageGenerationRequest["camera"]>("Close Up");
  const [ratio, setRatio] = useState<ImageGenerationRequest["ratio"]>("9:16");
  const [status, setStatus] = useState<StudioStatus>("idle");
  const [assets] = useState<ImageAsset[]>(readImageAssets);
  const history = useMemo(() => assetsForProject(assets, projectId), [assets, projectId]);
  const project = projects.find(item => item.id === projectId);
  const providers = listImageProviders();

  function prepareGeneration() {
    if (!prompt.trim() || !projectId) return;
    setStatus("ready");
  }

  return <section className="image-studio" aria-label="AI Image Studio">
    <div className="image-studio-heading">
      <div><span>AI COMMERCIAL VISUALS</span><h2>AI Image Studio</h2><p>为短视频、电商与广告准备高质量商业视觉素材。</p></div>
      <div className="image-provider-state"><i /> Image Provider Router 已就绪 · 模型待接入</div>
    </div>
    <div className="image-studio-grid">
      <aside className="image-settings">
        <header><span>01</span><div><h3>Image Settings</h3><p>定义视觉目标与生成规格</p></div></header>
        <label>关联项目<select aria-label="关联项目" value={projectId} onChange={event => { setProjectId(event.target.value); setStatus("idle"); }}><option value="" disabled>请选择项目</option>{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Prompt<textarea aria-label="Prompt" rows={7} value={prompt} onChange={event => { setPrompt(event.target.value); setStatus("idle"); }} placeholder="支持中文、English、Español 等多语言描述…" /><small>{prompt.length} / 2000 · Multilingual Prompt</small></label>
        <fieldset><legend>Image Type</legend><div className="image-option-grid">{imageTypes.map(item => <button type="button" className={imageType === item ? "selected" : ""} key={item} onClick={() => { setImageType(item); setStatus("idle"); }}>{item}</button>)}</div></fieldset>
        <label>Style<select aria-label="Style" value={style} onChange={event => { setStyle(event.target.value as typeof style); setStatus("idle"); }}>{styles.map(item => <option key={item}>{item}</option>)}</select></label>
        <label>Camera<select aria-label="Camera" value={camera} onChange={event => { setCamera(event.target.value as typeof camera); setStatus("idle"); }}>{cameras.map(item => <option key={item}>{item}</option>)}</select></label>
        <fieldset><legend>Ratio</legend><div className="ratio-options">{ratios.map(item => <button type="button" className={ratio === item.value ? "selected" : ""} key={item.value} onClick={() => { setRatio(item.value); setStatus("idle"); }}><span>{item.value}</span><small>{item.label}</small></button>)}</div></fieldset>
        <button className="image-generate" type="button" disabled={!prompt.trim() || !projectId} onClick={prepareGeneration}>准备生成图片 <span>↗</span></button>
      </aside>

      <main className="image-canvas">
        <header><div><span>02</span><h3>Image Canvas</h3></div><em>{ratio} · {style}</em></header>
        <div className={`canvas-stage ratio-${ratio.replace(":", "-")}`}>
          <div className="canvas-glow" />
          <div className="canvas-empty"><span>✦</span><h3>{status === "ready" ? "创作参数已就绪" : "从一个视觉想法开始"}</h3><p>{status === "ready" ? "Image Provider 接入后即可按当前配置生成，Step 6.1 不会自动调用模型。" : "输入多语言 Prompt 并选择图片类型、风格、机位与画幅。"}</p>{status === "ready" && <dl><div><dt>项目</dt><dd>{project?.name}</dd></div><div><dt>类型</dt><dd>{imageType}</dd></div><div><dt>镜头</dt><dd>{camera}</dd></div><div><dt>画幅</dt><dd>{ratio}</dd></div></dl>}</div>
        </div>
        <footer><span><i /> 安全草稿模式</span><p>当前阶段不产生图片、不计费，也不会调用视频生成。</p></footer>
      </main>

      <aside className="image-history">
        <header><div><span>03</span><h3>Generation History</h3></div><em>{history.length}</em></header>
        <div className="history-project"><small>当前项目</small><b>{project?.name || "未选择项目"}</b><span>{project?.product || "选择项目后查看资产"}</span></div>
        {history.length ? <div className="image-history-list">{history.map(asset => <article key={asset.id}><div className="asset-preview">IMAGE</div><b>{asset.imageType}</b><p>{asset.prompt}</p><span>{asset.style} · {asset.ratio}</span><small>{asset.model} · {new Date(asset.createdAt).toLocaleString("zh-CN")}</small></article>)}</div> : <div className="image-history-empty"><span>◫</span><h4>暂无图片资产</h4><p>未来生成的图片会按当前 Project 自动归档，并保留 Prompt、Style、Ratio、Model 与时间。</p></div>}
        <footer>{providers.map(provider => <span key={provider.id}><i /> {provider.label}<em>{provider.configured ? "Ready" : "Reserved"}</em></span>)}</footer>
      </aside>
    </div>
  </section>;
}
