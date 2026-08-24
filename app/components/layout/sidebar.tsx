import type { ActiveView } from "../../navigation";

type SidebarProps = {
  active: ActiveView;
  onNavigate: (view: ActiveView) => void;
  onHistory: () => void;
  counts: { library: number; monitor: number; history: number; products: number; reviews: number };
  teamConnected: boolean;
  onTeamToggle: () => void;
  project?:{name:string;product:string}|null;
};

const groups: Array<{ label: string; items: Array<{ id: ActiveView; icon: string; label: string }> }> = [
  { label: "总览", items: [{ id: "dashboard", icon: "⌂", label: "工作台首页" }, { id: "projects", icon: "▤", label: "我的项目" }] },
  { label: "创意策划", items: [
    { id: "create", icon: "✦", label: "AI 创作工作台" },
    { id: "breakdown", icon: "◇", label: "爆款洞察" },
    { id: "replicate", icon: "◎", label: "创意复刻" },
    { id: "checker", icon: "✓", label: "内容合规" },
  ] },
  { label: "内容制作", items: [
    { id: "images", icon: "◫", label: "AI 图片创作工作台" },
    { id: "video", icon: "▶", label: "视频洞察" },
    { id: "director", icon: "◉", label: "AI 导演工作台" },
    { id: "voice", icon: "♫", label: "AI 语音工作台" },
  ] },
  { label: "知识与资产", items: [
    { id: "products", icon: "▣", label: "产品知识库" },
    { id: "library", icon: "▦", label: "创意案例库" },
    { id: "monitor", icon: "⌁", label: "内容监测" },
    { id: "history", icon: "◷", label: "创作资产" },
    { id: "reviews", icon: "▥", label: "数据中心" },
  ] },
];

export default function Sidebar({ active, onNavigate, onHistory, counts, teamConnected, onTeamToggle, project }: SidebarProps) {
  const countFor = (id: ActiveView) => id === "library" ? counts.library : id === "monitor" ? counts.monitor : id === "history" ? counts.history : id === "products" ? counts.products : id === "reviews" ? counts.reviews : undefined;
  return <aside className="sidebar vf-sidebar">
    <button className="brand vf-brand" type="button" onClick={() => onNavigate("dashboard")} aria-label="返回工作台首页"><span className="brand-mark vf-brand-mark">V</span><div><strong>ViralFlow AI</strong><small>智能创意工作台</small></div></button>
    {active==="director"&&project?<button className="vf-director-project" onClick={()=>onNavigate("projects")}><span>{project.product.slice(0,2).toUpperCase()}</span><div><b>{project.product}</b><small>{project.name}</small></div><i>⌄</i></button>:<button className="vf-new-project" onClick={() => onNavigate("projects")}><span>＋</span> 新建项目</button>}
    <div className="vf-sidebar-scroll">
      {groups.map(group => <section className="vf-nav-group" key={group.label}>
        <p>{group.label}</p>
        <nav>{group.items.map(item => {
          const count = countFor(item.id);
          return <button key={item.id} title={item.label} aria-current={active === item.id ? "page" : undefined} className={active === item.id ? "nav-active" : ""} onClick={() => item.id === "history" ? onHistory() : onNavigate(item.id)}>
            <span>{item.icon}</span><b>{item.label}</b>{count !== undefined ? <em>{count}</em> : null}
          </button>;
        })}</nav>
      </section>)}
    </div>
    <div className={`sidebar-note team-note vf-team-card ${teamConnected ? "connected" : ""}`}><span>{teamConnected ? "● 团队云端已连接" : "团队云端空间"}</span><p>{teamConnected ? "产品资料、素材和历史脚本将同步给团队。" : "连接后，多台电脑可共享产品资料和历史脚本。"}</p><button onClick={onTeamToggle}>{teamConnected ? "断开本机" : "连接团队空间"}</button></div>
  </aside>;
}
