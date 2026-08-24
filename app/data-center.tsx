import type { AnalyticsData, DataMode, DemoProject } from "./demo-data";

type Props={mode:DataMode;data:AnalyticsData;projects:DemoProject[]};

export default function DataCenter({mode,data,projects}:Props){
  const max=Math.max(1,...data.trend.flatMap(item=>[item.scripts,item.director,item.voice]));
  return <section className="data-center" data-testid="data-center">
    <header className="data-center-head"><div><span>CREATIVE ANALYTICS</span><h1>数据中心</h1><p>查看创意生产节奏、项目结构与 AI 服务状态。</p></div><div><em className={mode==="demo"?"demo":"real"}>{mode==="demo"?"演示数据":"真实数据"}</em><small>{mode==="demo"?"独立展示层 · 不写入真实数据":"实时读取当前工作区"}</small></div></header>
    <section className="dc-summary">{[
      ["活跃项目",projects.length,"近 7 天"],["脚本方案",52,"多版本创作"],["导演方案",14,"镜头规划"],["语音生成",21,"多语言音轨"]
    ].map(([label,value,note])=><article key={String(label)}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <div className="dc-main-grid"><section className="dc-panel dc-trend"><header><div><span>创作趋势</span><h2>近 7 天生产节奏</h2></div><div className="dc-legend"><i className="scripts"/>脚本<i className="director"/>导演<i className="voice"/>语音</div></header><div className="dc-chart">{data.trend.map(item=><div key={item.label}><div className="dc-bars"><i className="scripts" style={{height:`${item.scripts/max*100}%`}}><b>{item.scripts}</b></i><i className="director" style={{height:`${item.director/max*100}%`}}><b>{item.director}</b></i><i className="voice" style={{height:`${item.voice/max*100}%`}}><b>{item.voice}</b></i></div><span>{item.label}</span></div>)}</div></section>
      <section className="dc-panel dc-services"><header><div><span>AI 服务状态</span><h2>工作流连接</h2></div><small>Provider</small></header><div>{data.services.map(item=><article key={item.label} className={item.status==="运行正常"?"online":""}><i/><div><b>{item.label}</b><span>{item.detail}</span></div><em>{item.status}</em></article>)}</div></section></div>
    <div className="dc-split-grid"><section className="dc-panel dc-distribution"><header><div><span>内容类型分布</span><h2>创作方向</h2></div><small>按项目归类</small></header><div className="dc-stacked">{data.contentTypes.map(item=><i key={item.label} style={{width:`${item.value}%`,background:item.color}}/>)}</div><div className="dc-dist-list">{data.contentTypes.map(item=><p key={item.label}><i style={{background:item.color}}/><span>{item.label}</span><b>{item.value}%</b></p>)}</div></section>
      <section className="dc-panel dc-markets"><header><div><span>市场分布</span><h2>目标地区</h2></div><small>4 个市场</small></header><div>{data.markets.map(item=><article key={item.code}><b>{item.code}</b><div><span>{item.label}</span><i><em style={{width:`${item.value}%`}}/></i></div><strong>{item.value}%</strong></article>)}</div></section></div>
    <section className="dc-panel dc-projects"><header><div><span>最近项目</span><h2>正在推进的创意生产</h2></div><small>{projects.length} 个演示项目</small></header><div>{projects.map(item=><article key={item.key}><b>{item.product.slice(0,1)}</b><div><h3>{item.title}</h3><p>{item.product} · {item.market} · {item.language}</p></div><span>{item.type}</span><em>{item.status}</em><small>{item.owner}</small></article>)}</div></section>
    <section className="dc-panel dc-records"><header><div><span>创作记录</span><h2>最近工作流活动</h2></div><small>仅用于产品形态演示</small></header><div className="dc-table"><div className="dc-row dc-table-head"><span>时间</span><span>项目</span><span>产品 / 市场</span><span>类型</span><span>状态</span><span>负责人</span></div>{data.records.map(item=><div className="dc-row" key={item.id}><span>{item.time}</span><strong>{item.project}</strong><span>{item.product}<small>{item.market}</small></span><span>{item.type}</span><em>{item.status}</em><span>{item.owner}</span></div>)}</div></section>
  </section>;
}
