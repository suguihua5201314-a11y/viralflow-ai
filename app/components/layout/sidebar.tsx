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
    { id: "images", icon: "◫", label: "AI图片创作工作台" },
    { id: "video", icon: "▶", label: "视频洞察" },
    { id: "director", icon: "◉", label: "AI分镜导演工作台" },
    { id: "voice", icon: "♫", label: "AI配音工作台" },
  ] },
  { label: "知识与素材", items: [
    { id: "products", icon: "▣", label: "产品知识库" },
    { id: "library", icon: "▦", label: "创意案例库" },
    { id: "monitor", icon: "⌁", label: "内容监测" },
    { id: "assets", icon: "◫", label: "项目素材库" },
    { id: "history", icon: "◷", label: "脚本历史" },
    { id: "reviews", icon: "▥", label: "数据中心" },
  ] },
];
const projectItems:Array<{id:ActiveView;icon:string;label:string}>=[
  {id:"breakdown",icon:"◇",label:"爆款研究"},{id:"replicate",icon:"◎",label:"内容策划"},{id:"create",icon:"▤",label:"脚本创作"},{id:"director",icon:"◉",label:"AI分镜导演"},{id:"images",icon:"▧",label:"视觉创作"},{id:"assets",icon:"◫",label:"素材管理"},{id:"voice",icon:"♫",label:"声音制作"},{id:"video",icon:"▷",label:"视频分析"},{id:"brain",icon:"▣",label:"项目大脑"},
];

export default function Sidebar({ active, onNavigate, onHistory, counts, teamConnected, onTeamToggle, project }: SidebarProps) {
  const countFor = (id: ActiveView) => id === "library" ? counts.library : id === "monitor" ? counts.monitor : id === "history" ? counts.history : id === "products" ? counts.products : id === "reviews" ? counts.reviews : undefined;
  const projectMode=active==="brain"||active==="director"||active==="create"||active==="breakdown"||active==="replicate"||active==="images"||active==="assets";
  return <aside className="os-sidebar os-vf-sidebar">
    <button className="os-brand os-vf-brand" type="button" onClick={() => onNavigate("dashboard")} aria-label="返回工作台首页"><span className="os-brand-mark os-vf-brand-mark">V</span><div><strong>ViralFlow AI</strong><small>AI短视频创作工作台</small></div></button>
    {projectMode&&project?<button className="os-vf-director-project" onClick={()=>onNavigate("projects")}><span>{project.product.slice(0,2).toUpperCase()}</span><div><b>{project.product}</b><small>{project.name}</small></div><i>⌄</i></button>:<button className="os-vf-new-project" onClick={() => onNavigate("projects")}><span>＋</span> 新建项目</button>}
    <div className="os-vf-sidebar-scroll"><nav className="creative-global-nav" aria-label="项目导航"><button onClick={()=>onNavigate("dashboard")}>首页</button><button onClick={()=>onNavigate("projects")}>项目</button><button onClick={onHistory}>脚本历史</button></nav>
      {projectMode?<section className="os-vf-nav-group os-vf-director-nav"><p>项目内容</p><nav>{projectItems.map(item=><button key={item.id} title={item.label} aria-current={item.id===active?"page":undefined} className={item.id===active?"nav-active":""} onClick={()=>item.id==="history"?onHistory():onNavigate(item.id)}><span>{item.icon}</span><b>{item.label}</b></button>)}</nav></section>:groups.map(group => <section className="os-vf-nav-group" key={group.label}>
        <p>{group.label}</p>
        <nav>{group.items.map(item => {
          const count = countFor(item.id);
          return <button key={item.id} title={item.label} aria-current={active === item.id ? "page" : undefined} className={active === item.id ? "nav-active" : ""} onClick={() => item.id === "history" ? onHistory() : onNavigate(item.id)}>
            <span>{item.icon}</span><b>{item.label}</b>{count !== undefined ? <em>{count}</em> : null}
          </button>;
        })}</nav>
      </section>)}
    </div>
    {projectMode?<div className="os-vf-director-sidebar-foot"><span>项目大脑</span><div><i/><b>当前项目上下文</b></div><small>{active==="director"?"分镜 · 图片 · 智能分析":active==="create"?"脚本 · 版本 · 合规":active==="breakdown"?"开场 · 结构 · 爆款洞察":"映射 · 创意 · 事实校验"}</small></div>:<div className={`os-sidebar-note os-team-note os-vf-team-card ${teamConnected ? "connected" : ""}`}><span>{teamConnected ? "● 团队云端已连接" : "团队云端空间"}</span><p>{teamConnected ? "产品资料、素材和历史脚本将同步给团队。" : "连接后，多台电脑可共享产品资料和历史脚本。"}</p><button onClick={onTeamToggle}>{teamConnected ? "断开本机" : "连接团队空间"}</button></div>}
  </aside>;
}
