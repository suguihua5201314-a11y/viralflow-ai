"use client";

import { useEffect, useState } from "react";
import type { ActiveView } from "../../navigation";

type SidebarProps = {
  active: ActiveView;
  onNavigate: (view: ActiveView) => void;
  teamConnected: boolean;
  onTeamToggle: () => void;
};

type IconName = "home" | "folder" | "assets" | "tools" | "insight" | "replicate" | "shield" | "mic";

function SidebarIcon({ name }: { name: IconName }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {name === "home" ? <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></> : null}
    {name === "folder" ? <path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/> : null}
    {name === "assets" ? <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></> : null}
    {name === "tools" ? <><path d="M4 7h16M7 12h10M9 17h6"/><circle cx="12" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="14" cy="17" r="2"/></> : null}
    {name === "insight" ? <><path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z"/><path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z"/></> : null}
    {name === "replicate" ? <><rect x="8" y="4" width="12" height="12" rx="2"/><path d="M16 20H6a2 2 0 0 1-2-2V8"/><path d="m12 10 2 2 3-4"/></> : null}
    {name === "shield" ? <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></> : null}
    {name === "mic" ? <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4m-4 0h8"/></> : null}
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
  const [toolsOpen, setToolsOpen] = useState(toolItems.some(item => item.id === active));
  const toolActive = toolItems.some(item => item.id === active);
  useEffect(() => { if (toolActive) setToolsOpen(true); }, [toolActive]);
  const globalActive = primaryItems.some(item => item.id === active) ? active : toolActive ? "tools" : "projects";
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
      <nav className="vf-global-nav" aria-label="产品导航">{primaryItems.map(navItem)}<button type="button" className={`vf-global-nav-item${globalActive === "tools" ? " nav-active" : ""}`} aria-expanded={toolsOpen} onClick={() => setToolsOpen(open => !open)}><SidebarIcon name="tools"/><span>工具</span><b aria-hidden="true">{toolsOpen ? "⌃" : "⌄"}</b></button></nav>
      {toolsOpen && <section className="vf-global-tools" aria-label="创作工具"><nav className="vf-global-nav" aria-label="创作工具导航">{toolItems.map(navItem)}</nav></section>}
    </div>
    <div className="vf-global-sidebar-bottom">
      <div className="vf-global-team-divider"/>
      <button className="vf-global-team" type="button" onClick={onTeamToggle} aria-label={teamConnected ? "苏苏团队，已连接，点击断开本机" : "苏苏团队，点击连接团队空间"} title={teamConnected ? "团队云端已连接" : "连接团队空间"}>
        <span className="vf-global-team-avatar">VF</span>
        <span className="vf-global-team-copy"><strong>苏苏团队</strong><small>团队版</small></span>
      </button>
    </div>
  </aside>;
}
