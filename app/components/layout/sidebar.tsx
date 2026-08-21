import type { ActiveView } from "../../navigation";

type SidebarProps = {
  active: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onHistory: () => void;
  counts: { library: number; monitor: number; history: number; products: number; reviews: number };
  teamConnected: boolean;
  onTeamToggle: () => void;
};

const groups: Array<{ label: string; items: Array<{ id: ActiveView; icon: string; label: string; badge?: string }> }> = [
  { label: "创作", items: [
    { id: "create", icon: "✦", label: "AI脚本生成" },
    { id: "breakdown", icon: "◇", label: "爆款拆解" },
    { id: "replicate", icon: "◎", label: "爆款复刻" },
    { id: "checker", icon: "✓", label: "违规风险检测" },
  ] },
  { label: "制作", items: [
    { id: "video", icon: "▶", label: "爆款视频拆解", badge: "AI" },
    { id: "director", icon: "◉", label: "AI拍摄导演", badge: "NEW" },
    { id: "voice", icon: "♫", label: "AI配音" },
  ] },
  { label: "资产与增长", items: [
    { id: "products", icon: "▣", label: "产品知识库" },
    { id: "library", icon: "▦", label: "爆款案例库" },
    { id: "monitor", icon: "⌁", label: "爆款监控" },
    { id: "history", icon: "◷", label: "历史脚本" },
    { id: "reviews", icon: "▥", label: "数据分析" },
  ] },
];

export default function Sidebar({ active, onNavigate, onHistory, counts, teamConnected, onTeamToggle }: SidebarProps) {
  const countFor = (id: ActiveView) => id === "library" ? counts.library : id === "monitor" ? counts.monitor : id === "history" ? counts.history : id === "products" ? counts.products : id === "reviews" ? counts.reviews : undefined;
  return <aside className="sidebar vf-sidebar">
    <div className="brand vf-brand"><span className="brand-mark vf-brand-mark">V</span><div><strong>ViralFlow AI</strong><small>AI Creative Pipeline</small></div></div>
    <button className="vf-new-project" onClick={() => onNavigate("create")}><span>＋</span> 新建创作</button>
    <div className="vf-sidebar-scroll">
      {groups.map(group => <section className="vf-nav-group" key={group.label}>
        <p>{group.label}</p>
        <nav>{group.items.map(item => {
          const count = countFor(item.id);
          return <button key={item.id} className={active === item.id ? "nav-active" : ""} onClick={() => item.id === "history" ? onHistory() : onNavigate(item.id)}>
            <span>{item.icon}</span><b>{item.label}</b>{item.badge ? <em>{item.badge}</em> : count !== undefined ? <em>{count}</em> : null}
          </button>;
        })}</nav>
      </section>)}
    </div>
    <div className={`sidebar-note team-note vf-team-card ${teamConnected ? "connected" : ""}`}><span>{teamConnected ? "● 团队云端已连接" : "团队云端空间"}</span><p>{teamConnected ? "产品资料、素材和历史脚本将同步给团队。" : "连接后，多台电脑可共享产品资料和历史脚本。"}</p><button onClick={onTeamToggle}>{teamConnected ? "断开本机" : "连接团队空间"}</button></div>
  </aside>;
}
