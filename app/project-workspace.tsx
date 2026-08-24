"use client";

import { useMemo, useState } from "react";
import type { ActiveView } from "./navigation";
import type { DemoProject } from "./demo-data";

type Props = { projects: DemoProject[]; initialProjectKey?: string | null; onNavigate: (view: ActiveView) => void };
const flow: Array<{key:keyof DemoProject["assets"];label:string;view:ActiveView;icon:string}> = [
  {key:"analysis",label:"爆款分析",view:"breakdown",icon:"◇"},{key:"replication",label:"创意复刻",view:"replicate",icon:"◎"},{key:"scripts",label:"Script V1/V2/V3",view:"create",icon:"✦"},{key:"director",label:"AI 导演方案",view:"director",icon:"◉"},{key:"voice",label:"AI 语音",view:"voice",icon:"♫"},{key:"reviews",label:"数据复盘",view:"reviews",icon:"▥"},
];
const time = (value?:string) => value ? new Date(value).toLocaleString("zh-CN",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}) : "暂无更新";

export default function ProjectWorkspace({projects,initialProjectKey,onNavigate}:Props){
  const [selectedKey,setSelectedKey]=useState<string|null>(initialProjectKey||null);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("全部项目");
  const [showDemoNote,setShowDemoNote]=useState(false);
  const selected=projects.find(item=>item.key===selectedKey)||null;
  const visible=useMemo(()=>projects.filter(item=>{
    const matches=!query.trim()||`${item.projectName}${item.product}${item.market}${item.platform}`.toLowerCase().includes(query.trim().toLowerCase());
    return matches&&(filter==="全部项目"||item.status===filter);
  }),[projects,query,filter]);
  if(selected)return <section className="project-detail">
    <button className="project-back" type="button" onClick={()=>setSelectedKey(null)}>← 返回我的项目</button>
    <header className="project-detail-hero"><div className="project-logo">{selected.product.slice(0,1)}</div><div><span>项目工作区 · {selected.status}</span><h2>{selected.projectName}</h2><p>{selected.product} · {selected.market} · {selected.platform} · {selected.language}</p></div><div className="project-detail-actions"><small>最近更新 {time(selected.updatedAt)}</small><button type="button" onClick={()=>onNavigate(flow.find(x=>x.label.includes(selected.stage))?.view||"create")}>{selected.nextAction} <i>→</i></button></div></header>
    <section className="project-progress"><header><div><span>项目进度</span><strong>{selected.progress}%</strong></div><p>当前阶段：<b>{selected.stage}</b> · 下一步：{selected.nextAction}</p></header><div><i style={{width:`${selected.progress}%`}} /></div></section>
    <div className="project-detail-grid"><main><section className="project-section-head"><div><span>CREATIVE PIPELINE</span><h3>项目创作流程</h3></div><p>每一步的内容都归属于当前项目</p></section><div className="project-flow-grid">{flow.map((item,index)=>{const count=selected.assets[item.key];const isCurrent=item.label.includes(selected.stage);return <button key={item.key} className={isCurrent?"current":""} onClick={()=>onNavigate(item.view)}><span>{item.icon}</span><div><small>STEP {index+1}</small><h4>{item.label}</h4><p>{count?`${count} 项项目资产`:"尚未开始"}</p></div><em>{isCurrent?"当前阶段":count?"查看":"开始"}</em><i>→</i></button>})}</div></main>
      <aside><section><span>产品信息</span><h3>{selected.product}</h3><dl><div><dt>目标市场</dt><dd>{selected.market}</dd></div><div><dt>发布平台</dt><dd>{selected.platform}</dd></div><div><dt>输出语言</dt><dd>{selected.language}</dd></div><div><dt>视频时长</dt><dd>{selected.duration}s</dd></div></dl><button onClick={()=>onNavigate("products")}>查看产品知识库 →</button></section><section><span>项目成员</span><div className="project-owner"><i>{selected.owner.slice(0,1)}</i><div><b>{selected.owner}</b><small>项目负责人</small></div><em>在线</em></div></section><section><span>最近创作</span><h4>{selected.title}</h4><p>{selected.type} · {time(selected.updatedAt)}</p></section></aside>
    </div>
  </section>;
  return <section className="projects-page"><header><div><span>PROJECT WORKSPACE</span><h2>我的项目</h2><p>以项目为容器，集中管理产品、创意、脚本、导演、语音与发布复盘。</p></div><button type="button" onClick={()=>setShowDemoNote(true)}><b>＋</b> 新建项目</button></header>
    {showDemoNote&&<aside className="project-demo-note"><div><b>当前为项目结构 Demo</b><span>本阶段仅展示产品结构与 UI，新建和保存将在后续数据接入阶段开放。</span></div><button aria-label="关闭提示" onClick={()=>setShowDemoNote(false)}>×</button></aside>}
    <section className="projects-toolbar"><div>{["全部项目","创作中","待审核","已完成"].map(item=><button className={filter===item?"active":""} onClick={()=>setFilter(item)} key={item}>{item}{item==="全部项目"&&<em>{projects.length}</em>}</button>)}</div><label><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索项目、产品、市场…" /></label></section>
    <div className="project-card-grid">{visible.map(item=><article key={item.key} onClick={()=>setSelectedKey(item.key)}><header><div className="project-logo">{item.product.slice(0,1)}</div><span className={`project-status status-${item.status}`}>{item.status}</span></header><h3>{item.projectName}</h3><p>{item.product}</p><div className="project-tags"><span>{item.market}</span><span>{item.platform}</span><span>{item.language}</span></div><section><div><span>当前阶段</span><b>{item.stage}</b></div><div><span>项目进度</span><b>{item.progress}%</b></div><aside><i style={{width:`${item.progress}%`}} /></aside></section><footer><div><span>更新于 {time(item.updatedAt)}</span><small>负责人 · {item.owner}</small></div><button onClick={e=>{e.stopPropagation();setSelectedKey(item.key)}}>{item.nextAction} <i>→</i></button></footer></article>)}</div>
    {!visible.length&&<div className="projects-empty"><span>▤</span><h3>没有找到匹配项目</h3><p>换一个关键词或筛选条件试试。</p></div>}
  </section>;
}
