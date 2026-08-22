import type { ActiveView } from "./navigation";
import type { DashboardMetrics } from "./dashboard-metrics";

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
};

type DashboardProps = {
  metrics: DashboardMetrics;
  recent: RecentWorkItem[];
  onNavigate: (view: ActiveView) => void;
  onOpenRecent: (key: string, destination: "script" | "director") => void;
};

const quickStarts: Array<{ view: ActiveView; icon: string; title: string; description: string; tone: string }> = [
  { view: "create", icon: "✦", title: "AI 创作工作台", description: "根据产品与创作参数，生成多条短视频脚本。", tone: "violet" },
  { view: "breakdown", icon: "◇", title: "爆款洞察", description: "拆解爆款内容的开场、结构、节奏与证明机制。", tone: "blue" },
  { view: "replicate", icon: "◎", title: "创意复刻", description: "保留爆款机制，结合目标产品生成原创方向。", tone: "indigo" },
  { view: "director", icon: "◉", title: "AI 导演工作台", description: "把脚本转成可执行镜头、动作与拍摄方案。", tone: "cyan" },
  { view: "voice", icon: "♫", title: "AI 语音工作台", description: "生成多语言口播，为后续视频制作准备音轨。", tone: "pink" },
  { view: "checker", icon: "✓", title: "内容合规", description: "检查脚本中的违规、绝对化与高风险表达。", tone: "green" },
];

const statCards = [
  { key: "products", label: "产品数量", context: "产品知识库", icon: "▣" },
  { key: "cases", label: "创意案例", context: "已保存爆款案例", icon: "▦" },
  { key: "scripts", label: "历史脚本", context: "创作资产", icon: "◷" },
  { key: "recent", label: "最近创作", context: "当前可继续处理", icon: "↗" },
] as const;

const formatTime = (value?: string) => {
  if (!value) return "暂无更新时间";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "暂无更新时间" : date.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const statDestinations: Record<string, ActiveView> = { products: "products", cases: "library", scripts: "history", recent: "create" };

export default function Dashboard({ metrics, recent, onNavigate, onOpenRecent }: DashboardProps) {
  const counts = metrics.counts;
  const trendMax = Math.max(1, ...metrics.trend.map(item => item.count));
  return <section className="vf-dashboard" data-testid="dashboard-home">
    <section className="vf-dashboard-hero">
      <div className="vf-hero-copy"><span><i /> ViralFlow AI · 智能创意工作台</span><h2>欢迎回来，苏苏团队</h2><p>从爆款洞察到脚本、导演与成片，在一个工作台完成。</p></div>
      <div className="vf-hero-actions"><small>创意生产中枢</small><button type="button" onClick={() => onNavigate("create")}><span>＋</span> 开始新创作 <i>→</i></button></div>
    </section>

    <div className="vf-dashboard-layout"><main className="vf-dashboard-main">
      <section className="vf-dashboard-section">
        <header><div><span>快速开始</span><h2>选择下一步工作</h2></div><p>所有入口均连接现有真实功能</p></header>
        <div className="vf-quick-grid">{quickStarts.map(item => <button type="button" key={item.view} data-tone={item.tone} onClick={() => onNavigate(item.view)}><span>{item.icon}</span><div><h3>{item.title}</h3><p>{item.description}</p></div><i>↗</i></button>)}</div>
      </section>

      <section className="vf-dashboard-section">
        <header><div><span>数据概览</span><h2>真实资产总览</h2></div><p>仅统计当前系统中可读取的数据</p></header>
        <div className="vf-metric-grid">{statCards.map(item => <article key={item.key}><div><span>{item.label}</span><i>{item.icon}</i></div><strong>{counts[item.key]}</strong><small><b>{counts[item.key] === 0 ? "暂无数据" : "数据已同步"}</b>{item.context}</small><button type="button" onClick={() => onNavigate(statDestinations[item.key])}>查看 →</button></article>)}</div>
      </section>

      <section className="vf-dashboard-section vf-recent-section">
        <header><div><span>最近创作</span><h2>继续你的内容工作</h2></div><button type="button" onClick={() => onNavigate("history")}>查看全部创作资产 →</button></header>
        {recent.length === 0 ? <div className="vf-recent-empty"><span><i>✦</i></span><h3>还没有最近创作</h3><p>从 AI 创作工作台、爆款洞察或创意复刻开始第一个项目。</p><button type="button" onClick={() => onNavigate("create")}>开始创作 <i>→</i></button></div> : <div className="vf-recent-list">{recent.map(item => <article key={item.key}>
          <div className="vf-recent-mark">{item.product.trim().slice(0, 1) || "创"}</div>
          <div className="vf-recent-main"><div><span>{item.current ? "当前采用" : "脚本"}</span><small>{formatTime(item.updatedAt)}</small></div><h3>{item.title}</h3><p>{item.product} · {item.market || "未设置市场"}</p></div>
          <div className="vf-recent-meta"><span>{item.language || "未设置语言"}</span><span>{item.platform}</span><span>{item.duration}s</span></div>
          <div className="vf-recent-actions"><button type="button" onClick={() => onOpenRecent(item.key, "script")}>查看脚本</button><button type="button" onClick={() => onOpenRecent(item.key, "director")}>进入导演</button></div>
        </article>)}</div>}
      </section>

      <section className="vf-dashboard-section vf-trend-section"><header><div><span>创作趋势</span><h2>近 7 天真实活动</h2></div><p>{metrics.periods.available ? `今日 ${metrics.periods.today} · 本周 ${metrics.periods.week} · 本月 ${metrics.periods.month}` : "暂无历史统计"}</p></header>
        {metrics.trend.some(item => item.count > 0) ? <div className="vf-trend-chart">{metrics.trend.map(item => <div className="vf-trend-day" key={item.label}><span className="vf-trend-bar" style={{ height: `${Math.max(8, item.count / trendMax * 100)}%` }}><b>{item.count}</b></span><span>{item.label}</span></div>)}</div> : <div className="vf-trend-empty">暂无趋势数据；产生带时间记录的脚本、案例或产品更新后显示。</div>}
      </section>
      <section className="vf-pipeline"><span>创意生产路径</span>{["爆款洞察", "脚本", "创意复刻", "导演", "配音"].map((label, index) => <div key={label}><b>{index + 1}</b>{label}{index < 4 && <i>→</i>}</div>)}</section>
    </main>

    <aside className="vf-intelligence-rail">
      <section><header><span>创作概览</span><b>实时派生</b></header><div className="vf-rail-overview"><p><span>产品</span><strong>{counts.products}</strong></p><p><span>案例</span><strong>{counts.cases}</strong></p><p><span>脚本</span><strong>{counts.scripts}</strong></p><p><span>导演方案</span><strong>暂无数据</strong></p></div></section>
      <section><header><span>最近动态</span><b>{metrics.activity.length ? `${metrics.activity.length} 条` : "暂无"}</b></header>{metrics.activity.length ? <div className="vf-activity-list">{metrics.activity.map(item => <article key={item.id}><i /><div><b>{item.title}</b><small>{formatTime(item.timestamp)} · {item.type}</small></div></article>)}</div> : <p className="vf-rail-empty">暂无带可靠时间的创作活动。</p>}</section>
      <section><header><span>可读取 AI 记录</span><b>非请求次数</b></header><div className="vf-usage-list"><p><span>脚本记录</span><strong>{metrics.usage.scripts}</strong></p><p><span>洞察案例</span><strong>{metrics.usage.analyzer}</strong></p><p><span>创意复刻</span><strong>暂无数据</strong></p><p><span>导演方案</span><strong>暂无数据</strong></p></div></section>
      <section><header><span>AI 服务状态</span><b>Provider</b></header><div className="vf-provider-list">{metrics.providers.map(item => <p key={item.id} className={item.connected ? "connected" : ""}><i /><span>{item.label}</span><strong>{item.status}</strong></p>)}</div></section>
    </aside></div>
  </section>;
}
