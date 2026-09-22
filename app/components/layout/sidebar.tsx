import type { ActiveView } from "../../navigation";

type SidebarProps = {
  active: ActiveView;
  onNavigate: (view: ActiveView) => void;
  teamConnected: boolean;
  onTeamToggle: () => void;
};

type IconName = "home" | "folder" | "assets" | "insight" | "replicate" | "shield" | "mic" | "help" | "settings";

function SidebarIcon({ name }: { name: IconName }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {name === "home" ? <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></> : null}
    {name === "folder" ? <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/> : null}
    {name === "assets" ? <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></> : null}
    {name === "insight" ? <><path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></> : null}
    {name === "replicate" ? <><rect x="8" y="4" width="12" height="12" rx="2"/><path d="M16 20H6a2 2 0 0 1-2-2V8"/><path d="m12 10 2 2 3-4"/></> : null}
    {name === "shield" ? <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></> : null}
    {name === "mic" ? <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/></> : null}
    {name === "help" ? <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.3 1.7c-1.2 1-1.8 1.5-1.8 3.3m0 3h.01"/></> : null}
    {name === "settings" ? <><path d="M10 2h4l.6 2.3 1.8.8 2.1-1.2 2.8 2.8-1.2 2.1.8 1.8L23 11v4l-2.3.6-.8 1.8 1.2 2.1-2.8 2.8-2.1-1.2-1.8.8L14 24h-4l-.6-2.3-1.8-.8-2.1 1.2-2.8-2.8 1.2-2.1-.8-1.8L1 15v-4l2.3-.6.8-1.8-1.2-2.1 2.8-2.8 2.1 1.2 1.8-.8L10 2Z" transform="translate(0 -1) scale(1 .92)"/><circle cx="12" cy="12" r="3"/></> : null}
  </svg>;
}

const primaryItems: Array<{ id: ActiveView; label: string; icon: IconName }> = [
  { id: "dashboard", label: "首页", icon: "home" },
  { id: "projects", label: "项目", icon: "folder" },
  { id: "assets", label: "资产库", icon: "assets" },
];

const toolItems: Array<{ id: ActiveView; label: string; icon: IconName }> = [
  { id: "breakdown", label: "爆款洞察", icon: "insight" },
  { id: "replicate", label: "创意复刻", icon: "replicate" },
  { id: "checker", label: "内容合规", icon: "shield" },
  { id: "voice", label: "AI 语音", icon: "mic" },
];

export default function Sidebar({ active, onNavigate, teamConnected, onTeamToggle }: SidebarProps) {
  const globalActive = primaryItems.concat(toolItems).some(item => item.id === active) ? active : "projects";
  const navItem = (item: { id: ActiveView; label: string; icon: IconName }) => <button
    key={item.id}
    type="button"
    className={`vf-global-nav-item${globalActive === item.id ? " nav-active" : ""}`}
    aria-current={globalActive === item.id ? "page" : undefined}
    onClick={() => onNavigate(item.id)}
  ><SidebarIcon name={item.icon}/><span>{item.label}</span></button>;

  return <aside className="os-sidebar os-vf-sidebar vf-global-sidebar" aria-label="全局导航">
    <button className="os-brand os-vf-brand vf-global-brand" type="button" onClick={() => onNavigate("dashboard")} aria-label="返回首页">
      <span className="os-brand-mark os-vf-brand-mark">V</span>
      <span className="vf-global-brand-copy"><strong>ViralFlow AI</strong><small>Turn Ideas into Viral Videos</small></span>
    </button>
    <div className="vf-global-sidebar-main">
      <nav className="vf-global-nav" aria-label="产品导航">{primaryItems.map(navItem)}</nav>
      <section className="vf-global-tools" aria-label="创作工具">
        <h2>创作工具</h2>
        <nav className="vf-global-nav" aria-label="创作工具导航">{toolItems.map(navItem)}</nav>
      </section>
    </div>
    <div className="vf-global-sidebar-bottom">
      <nav className="vf-global-nav" aria-label="帮助和设置">
        <button type="button" className="vf-global-nav-item" disabled title="帮助中心即将开放"><SidebarIcon name="help"/><span>帮助中心</span></button>
        <button type="button" className="vf-global-nav-item" disabled title="设置页面即将开放"><SidebarIcon name="settings"/><span>设置</span></button>
      </nav>
      <div className="vf-global-team-divider"/>
      <button className="vf-global-team" type="button" onClick={onTeamToggle} aria-label={teamConnected ? "苏苏团队，已连接，点击断开本机" : "苏苏团队，点击连接团队空间"} title={teamConnected ? "团队云端已连接" : "连接团队空间"}>
        <span className="vf-global-team-avatar">VF</span>
        <span className="vf-global-team-copy"><strong>苏苏团队</strong><small>团队版</small></span>
      </button>
    </div>
  </aside>;
}
