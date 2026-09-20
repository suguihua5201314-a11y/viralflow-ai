import { useEffect, useMemo, useState } from "react";
import type { ActiveView } from "./navigation";
import type { DashboardMetrics } from "./dashboard-metrics";
import WorkspaceState from "./components/ui/workspace-state";
import type { DataMode } from "./demo-data";
import { readImageAssets, type ImageAsset } from "./image-assets";

export type RecentWorkItem = {
  key: string;
  title: string;
  product: string;
  market: string;
  language: string;
  platform: string;
  duration: number;
  updatedAt?: string;
  current: boolean;
  projectName?: string;
  stage?: string;
  nextAction?: string;
};

type DashboardProps = {
  metrics: DashboardMetrics;
  recent: RecentWorkItem[];
  onNavigate: (view: ActiveView) => void;
  onOpenRecent: (key: string, destination: "script" | "director") => void;
  onOpenProject: (key: string) => void;
  dataMode: DataMode;
};

const workflowSteps: Array<{ view?: ActiveView; icon: string; title: string; description: string }> = [
  { view: "breakdown", icon: "◇", title: "爆款研究", description: "看懂高表现内容为什么有效" },
  { view: "replicate", icon: "◎", title: "内容策划", description: "把爆款机制变成原创方向" },
  { view: "create", icon: "✦", title: "脚本创作", description: "生成自然、可拍的 UGC 脚本" },
  { view: "director", icon: "▦", title: "AI 分镜", description: "拆成镜头、动作与拍摄方案" },
  { view: "images", icon: "▧", title: "视觉创作", description: "围绕分镜生成视觉版本" },
  { view: "voice", icon: "♫", title: "声音制作", description: "制作多语言口播与音轨" },
  { icon: "▶", title: "视频制作", description: "即将开放完整成片工作流" },
];

const quickStarts: Array<{ view: ActiveView; icon: string; title: string; description: string }> = [
  { view: "products", icon: "□", title: "从商品开始", description: "先整理商品事实、卖点与合规边界" },
  { view: "breakdown", icon: "◇", title: "从爆款视频开始", description: "拆解一个参考内容的创意机制" },
  { view: "create", icon: "✦", title: "从脚本开始", description: "直接进入 AI 脚本创作工作台" },
  { view: "assets", icon: "▧", title: "从素材开始", description: "打开当前项目的真实素材库" },
];

const commandModes: Array<{ id: "product" | "viral" | "script" | "asset"; label: string; view: ActiveView }> = [
  { id: "product", label: "商品", view: "products" },
  { id: "viral", label: "爆款内容", view: "breakdown" },
  { id: "script", label: "脚本", view: "create" },
  { id: "asset", label: "素材", view: "assets" },
];

const formatTime = (value?: string) => {
  if (!value) return "暂无更新时间";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "暂无更新时间"
    : date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Singapore",
      });
};

const promptTitle = (asset: ImageAsset) => {
  const value = asset.prompt.trim();
  return value.length > 36 ? `${value.slice(0, 36)}…` : value || "未命名视觉素材";
};

export default function Dashboard({ recent, onNavigate, onOpenRecent, onOpenProject, dataMode }: DashboardProps) {
  const [commandMode, setCommandMode] = useState<(typeof commandModes)[number]["id"]>("product");
  const [command, setCommand] = useState("");
  const [imageAssets, setImageAssets] = useState<ImageAsset[]>([]);

  useEffect(() => {
    const syncAssets = () => setImageAssets(readImageAssets());
    syncAssets();
    window.addEventListener("storage", syncAssets);
    return () => window.removeEventListener("storage", syncAssets);
  }, []);

  const latestAssetByProject = useMemo(() => {
    const byProject = new Map<string, ImageAsset>();
    [...imageAssets]
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
      .forEach((asset) => {
        if (!byProject.has(asset.projectId)) byProject.set(asset.projectId, asset);
      });
    return byProject;
  }, [imageAssets]);

  const featuredAsset = recent.map((item) => latestAssetByProject.get(item.key)).find(Boolean) || imageAssets[0];
  const inspirationAssets = [...imageAssets].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)).slice(0, 4);
  const featuredProject = recent[0];
  const openRecent = (item: RecentWorkItem) => (item.projectName ? onOpenProject(item.key) : onOpenRecent(item.key, "script"));
  const beginCommand = () => onNavigate(commandModes.find((item) => item.id === commandMode)?.view || "create");

  return (
    <section className="vf-dashboard vf-dashboard-vnext" data-testid="dashboard-home">
      <section className="vf-home-hero">
        <div className="vf-home-hero-copy">
          <span className="vf-home-eyebrow">从创意到成片，让好产品被更多人看到</span>
          <h1>今天想<span>创作什么</span>？</h1>
          <p>把商品、爆款内容或创意变成可执行短视频。</p>
          {dataMode === "demo" ? <em className="vf-demo-badge">演示数据</em> : null}

          <form className="vf-command-bar" onSubmit={(event) => { event.preventDefault(); beginCommand(); }}>
            <div className="vf-command-modes" aria-label="创作起点">
              {commandModes.map((item) => (
                <button className={commandMode === item.id ? "is-active" : ""} key={item.id} type="button" onClick={() => setCommandMode(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="vf-command-entry">
              <span aria-hidden="true">✦</span>
              <textarea
                aria-label="描述想制作的短视频"
                value={command}
                rows={2}
                onChange={(event) => setCommand(event.target.value)}
                placeholder="描述你想制作的短视频，例如：展示防窥膜安装过程，并突出侧面防窥效果……"
              />
              <button className="vf-button vf-button-primary" type="submit">开始创作 <i>→</i></button>
            </div>
          </form>
        </div>

        <div className={`vf-hero-visual${featuredAsset ? " has-asset" : ""}`} aria-label="当前项目创作内容预览">
          <div className="vf-hero-visual-main">
            {featuredAsset ? (
              <img src={featuredAsset.imageUrl} alt={promptTitle(featuredAsset)} />
            ) : (
              <div className="vf-hero-neutral-visual" aria-hidden="true">
                <span className="vf-neutral-product">PRODUCT</span>
                <i className="vf-neutral-orbit one" />
                <i className="vf-neutral-orbit two" />
                <b>V</b>
              </div>
            )}
            <div className="vf-visual-caption">
              <span>{featuredAsset ? "当前视觉版本" : "创意视觉"}</span>
              <strong>{featuredProject?.projectName || featuredProject?.product || "从一个想法开始"}</strong>
            </div>
          </div>
          <div className="vf-floating-card vf-floating-script"><span>脚本方向</span><strong>{featuredProject?.stage || "UGC 创意"}</strong><small>Hook → Proof → CTA</small></div>
          <div className="vf-floating-card vf-floating-insight"><span>AI 分镜</span><strong>画面与动作</strong><small>围绕真实卖点组织镜头</small></div>
          <div className="vf-floating-card vf-floating-audio"><span>声音制作</span><div aria-hidden="true"><i /><i /><i /><i /><i /></div></div>
        </div>
      </section>

      <section className="vf-home-section vf-workflow-section">
        <header><div><span>CREATIVE PIPELINE</span><h2>完整创作流程</h2><p>从爆款洞察到成片发布，AI 全程协力</p></div></header>
        <div className="vf-pipeline">
          {workflowSteps.map((item, index) => (
            <div className="vf-pipeline-item" key={item.title}>
              <button type="button" disabled={!item.view} onClick={() => item.view && onNavigate(item.view)}>
                <span className="vf-pipeline-icon">{item.icon}</span><small>{String(index + 1).padStart(2, "0")}</small><h3>{item.title}</h3><p>{item.description}</p>
              </button>
              {index < workflowSteps.length - 1 ? <i className="vf-pipeline-arrow" aria-hidden="true">→</i> : null}
            </div>
          ))}
        </div>
      </section>

      <section className="vf-home-section vf-recent-section">
        <header>
          <div><span>RECENT PROJECTS</span><h2>继续创作</h2><p>回到最近更新的项目与素材</p></div>
          <button className="vf-button vf-button-tertiary" type="button" onClick={() => onNavigate("projects")}>查看全部项目 →</button>
        </header>
        {recent.length === 0 ? (
          <WorkspaceState compact eyebrow="最近项目" title="还没有创作项目" description="从一个真实产品开始，脚本、分镜和素材都会归入同一个项目。" primary={{ label: "新建第一个项目", onClick: () => onNavigate("projects") }} secondary={{ label: "先看爆款研究", onClick: () => onNavigate("breakdown") }} />
        ) : (
          <div className="vf-project-card-grid">
            {recent.slice(0, 3).map((item) => {
              const thumbnail = latestAssetByProject.get(item.key);
              return (
                <article className="vf-project-visual-card" key={item.key}>
                  <button className="vf-project-preview" type="button" onClick={() => openRecent(item)} aria-label={`打开项目 ${item.projectName || item.title}`}>
                    {thumbnail ? <img src={thumbnail.imageUrl} alt={promptTitle(thumbnail)} /> : <div className="vf-project-placeholder"><span>{item.product.trim().slice(0, 1) || "创"}</span><small>{item.product || "创作项目"}</small></div>}
                    <em>{item.stage || "创作中"}</em>
                  </button>
                  <div className="vf-project-card-body">
                    <div><h3>{item.projectName || item.title}</h3><p>{item.market || "未设置市场"} · {item.platform || "TikTok"}</p></div>
                    <time>{formatTime(item.updatedAt)}</time>
                    <button className="vf-button vf-button-card" type="button" onClick={() => openRecent(item)}>继续创作 <i>→</i></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="vf-home-section vf-quick-start-section">
        <header><div><span>QUICK START</span><h2>快速开始</h2><p>选择你已经拥有的内容，直接进入对应工作台</p></div></header>
        <div className="vf-quick-start-grid">
          {quickStarts.map((item) => (
            <button type="button" key={item.view} onClick={() => onNavigate(item.view)}><span>{item.icon}</span><div><h3>{item.title}</h3><p>{item.description}</p></div><i>→</i></button>
          ))}
        </div>
      </section>

      <section className="vf-home-section vf-inspiration-section">
        <header><div><span>CREATIVE INSPIRATION</span><h2>创意灵感</h2><p>来自项目中已经生成的真实视觉素材</p></div><button className="vf-button vf-button-tertiary" type="button" onClick={() => onNavigate("assets")}>打开素材库 →</button></header>
        {inspirationAssets.length ? (
          <div className="vf-inspiration-row">
            {inspirationAssets.map((asset) => {
              const project = recent.find((item) => item.key === asset.projectId);
              return (
                <button type="button" key={asset.id} onClick={() => onNavigate("assets")}><img src={asset.imageUrl} alt={promptTitle(asset)} /><span><strong>{promptTitle(asset)}</strong><small>{asset.imageType} · {project?.market || "项目素材"} · {project?.platform || asset.ratio}</small></span></button>
              );
            })}
          </div>
        ) : (
          <div className="vf-inspiration-empty"><span>✦</span><div><h3>灵感会从真实素材中生长</h3><p>完成第一张项目图片后，这里会展示可继续复用的视觉方向。</p></div><button className="vf-button vf-button-secondary" type="button" onClick={() => onNavigate("images")}>创建视觉素材</button></div>
        )}
      </section>
    </section>
  );
}
