import type { ActiveView } from "./navigation";
import type { DashboardMetrics } from "./dashboard-metrics";
import WorkspaceState from "./components/ui/workspace-state";
import type { DataMode } from "./demo-data";

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

const quickStarts: Array<{
  view: ActiveView;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    view: "breakdown",
    icon: "◇",
    title: "爆款研究",
    description: "拆解开场、结构、节奏与 Proof 机制。",
  },
  {
    view: "create",
    icon: "✦",
    title: "脚本创作",
    description: "从产品知识开始创作可拍摄短视频脚本。",
  },
  {
    view: "director",
    icon: "◉",
    title: "AI 分镜导演",
    description: "把脚本转成镜头、动作与拍摄方案。",
  },
  {
    view: "images",
    icon: "▧",
    title: "视觉创作",
    description: "围绕当前分镜生成和管理视觉版本。",
  },
  {
    view: "assets",
    icon: "◫",
    title: "素材管理",
    description: "浏览、筛选并复用当前项目素材。",
  },
  {
    view: "voice",
    icon: "♫",
    title: "声音制作",
    description: "制作多语言口播与可交付音轨。",
  },
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

export default function Dashboard({ recent, onNavigate, onOpenRecent, onOpenProject, dataMode }: DashboardProps) {
  const openRecent = (item: RecentWorkItem) => (item.projectName ? onOpenProject(item.key) : onOpenRecent(item.key, "script"));
  return (
    <section className="vf-dashboard vf-dashboard-v3" data-testid="dashboard-home">
      <section className="vf-dashboard-hero">
        <div className="vf-hero-copy">
          <span>ViralFlow AI · Creative OS</span>
          <h2>今天想从哪里开始？</h2>
          <p>继续上次创作，或从一个新的创意方向开始。</p>
          {dataMode === "demo" ? <em className="vf-demo-badge">演示数据</em> : null}
        </div>
        <div className="vf-hero-actions">
          <button type="button" onClick={() => onNavigate("create")}>
            开始新创作 <i>→</i>
          </button>
        </div>
      </section>

      <section className="vf-dashboard-section vf-recent-section">
        <header>
          <div>
            <span>继续工作</span>
            <h2>回到最近的项目</h2>
          </div>
          <button type="button" onClick={() => onNavigate("projects")}>
            查看全部项目 →
          </button>
        </header>
        {recent.length === 0 ? (
          <WorkspaceState
            compact
            eyebrow="最近项目"
            title="还没有创作项目"
            description="从一个真实产品开始，脚本、分镜和素材都会归入同一个项目。"
            primary={{
              label: "新建第一个项目",
              onClick: () => onNavigate("projects"),
            }}
            secondary={{
              label: "先看爆款研究",
              onClick: () => onNavigate("breakdown"),
            }}
          />
        ) : (
          <>
            <article className="vf-continue-project">
              <div>
                <span>继续上次创作</span>
                <h3>{recent[0].projectName || recent[0].title}</h3>
                <p>
                  {recent[0].stage || "脚本创作"} · {formatTime(recent[0].updatedAt)}
                </p>
              </div>
              <button type="button" onClick={() => openRecent(recent[0])}>
                继续 <i>→</i>
              </button>
            </article>
            <div className="vf-recent-list">
              {recent.slice(1, 4).map((item) => (
                <article key={item.key}>
                  <div className="vf-recent-mark">{item.product.trim().slice(0, 1) || "创"}</div>
                  <div className="vf-recent-main">
                    <div>
                      <span>{item.stage || (item.current ? "当前采用" : "脚本")}</span>
                      <small>{formatTime(item.updatedAt)}</small>
                    </div>
                    <h3>{item.projectName || item.title}</h3>
                    <p>
                      {item.product} · {item.market || "未设置市场"}
                    </p>
                  </div>
                  <div className="vf-recent-meta">
                    <span>{item.language || "未设置语言"}</span>
                    <span>{item.platform}</span>
                  </div>
                  <div className="vf-recent-actions">
                    <button type="button" onClick={() => openRecent(item)}>
                      打开项目
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="vf-dashboard-section vf-workflow-section">
        <header>
          <div>
            <span>Creative Workflow</span>
            <h2>选择下一步工作</h2>
          </div>
          <p>每个入口都连接当前项目的真实内容</p>
        </header>
        <div className="vf-quick-grid">
          {quickStarts.map((item) => (
            <button type="button" key={item.view} onClick={() => onNavigate(item.view)}>
              <span>{item.icon}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <i>→</i>
            </button>
          ))}
        </div>
      </section>
    </section>
  );
}
