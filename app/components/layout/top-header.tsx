import type { ActiveView } from "../../navigation";
import { viewMeta } from "../../navigation";

export default function TopHeader({ active, aiConnected, teamConnected }: { active: ActiveView; aiConnected: boolean; teamConnected: boolean }) {
  const meta = viewMeta[active];
  return <header className="vf-top-header">
    <div className="vf-header-title"><span>{meta.eyebrow}</span><div><div className="vf-breadcrumb"><b>ViralFlow AI</b><i>›</i><span>{meta.label}</span></div><h1>{meta.label}</h1><p>{meta.description}</p></div></div>
    <div className="vf-header-actions">
      <div className={`vf-service-state ${aiConnected ? "is-online" : ""}`}><i />{aiConnected ? "AI 服务已连接" : "本地稳定模式"}</div>
      <div className={`vf-team-state ${teamConnected ? "is-online" : ""}`}>{teamConnected ? "团队已同步" : "团队未连接"}</div>
      <button className="vf-icon-button" type="button" aria-label="帮助">?</button>
      <div className="vf-user"><span>VF</span><div><b>苏苏团队</b><small>内容管理员</small></div></div>
    </div>
  </header>;
}
