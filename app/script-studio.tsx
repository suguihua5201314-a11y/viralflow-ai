"use client";

import { useMemo, useState } from "react";
import { checkCompliance } from "./compliance-rules";

export type StudioScene = { time: string; visual: string; line: string; edit: string };
export type StudioScript = { id?: number; title: string; product: string; language: string; country: string; style: string; hook: string; alternateHooks: string[]; narration: string; scenes: StudioScene[]; createdAt?: string; aiGenerated?: boolean };
export type StudioProduct = { id:number; name:string; brand:string; category:string; sellingPoints:string; parameters:string; bannedWords:string; markets:string; audience:string; price:string; offer:string; notes:string; updatedAt:string };
export type StudioForm = { product:string; sellingPoints:string; audience:string; country:string; language:string; style:string; framework:string; duration:string; offer:string };
export type StudioScore = { total:number; hook:number; structure:number; proof:number; conversion:number; risks:number };

type Props = {
  mode:"create"|"replicate"; form:StudioForm; products:StudioProduct[]; languages:string[]; styles:string[];
  frameworks:Array<{name:string;group:string}>; referenceScript:string; result:StudioScript|null; raceResults:StudioScript[];
  loading:boolean; raceLoading:boolean; inputReady:boolean; error:string; aiConnected:boolean;
  historyCount:number; onUpdate:(key:keyof StudioForm,value:string)=>void; onUseProduct:(product:StudioProduct)=>void;
  onReferenceChange:(value:string)=>void; onGenerate:()=>void; onGenerateRace:()=>void; onAdopt:(script:StudioScript)=>void;
  onCopy:(text:string)=>void; onExport:(script:StudioScript)=>void; onNavigate:(view:"history"|"director"|"voice")=>void;
  scoreScript:(script:StudioScript)=>StudioScore;
};

const versions = ["A","B","C","D","E"];

export default function ScriptStudio(props:Props) {
  const [platform,setPlatform] = useState("TikTok");
  const [briefNotes,setBriefNotes] = useState("");
  const [hookType,setHookType] = useState("智能匹配");
  const [creativeStrength,setCreativeStrength] = useState("平衡");
  const [locked,setLocked] = useState<Record<string,boolean>>({});
  const [compare,setCompare] = useState<number[]>([]);
  const script = props.result;
  const score = script ? props.scoreScript(script) : null;
  const hits = useMemo(()=>script ? checkCompliance(script.narration) : [],[script]);
  const steps = ["产品与 Brief","创意设置","AI 生成","赛马筛选","合规确认"];
  const currentStep = props.raceResults.length ? 3 : script ? 2 : 0;
  const sections = useMemo(()=>{
    if (!script) return [];
    const scenes=script.scenes;
    return [
      ["HOOK / 前3秒",script.hook],
      ["问题 / 冲突",scenes[1]?.line || "当前脚本未单独标注"],
      ["产品出现",scenes[2]?.line || scenes[0]?.line || "当前脚本未单独标注"],
      ["演示 / 证明",scenes.slice(2,-2).map(x=>x.line).join(" ") || "当前脚本未单独标注"],
      ["核心卖点",scenes.at(-2)?.line || props.form.sellingPoints],
      ["CTA",scenes.at(-1)?.line || "当前脚本未单独标注"],
      ["拍摄建议",scenes.map(x=>`${x.time} ${x.visual} · ${x.edit}`).join("\n")],
    ] as Array<[string,string]>;
  },[script,props.form.sellingPoints]);

  return <section className="script-studio">
    <header className="studio-titlebar"><div><span className="studio-kicker">AI SCRIPT STUDIO</span><h1>AI 脚本生成工作台</h1><p>从产品 Brief 到赛马筛选、合规确认，一条工作流完成可拍脚本。</p></div><div className="studio-title-actions"><button onClick={()=>props.onNavigate("history")}>版本历史 <b>{props.historyCount}</b></button><button className="disabled-action" disabled>保存到项目 <em>待接入</em></button></div></header>
    <nav className="studio-workflow" aria-label="脚本工作流">{steps.map((step,index)=><div key={step} className={index<=currentStep?"done":""}><span>{index<currentStep?"✓":index+1}</span><b>{step}</b><i /></div>)}</nav>

    <div className="studio-grid">
      <aside className="studio-column studio-brief">
        <div className="studio-card-head"><div><span>01 · CREATIVE BRIEF</span><h2>创作 Brief</h2></div><small>真实输入</small></div>
        <label>从产品知识库选择<select value="" onChange={e=>{const item=props.products.find(x=>String(x.id)===e.target.value);if(item)props.onUseProduct(item)}}><option value="">选择产品自动填充…</option>{props.products.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        {props.mode==="replicate"&&<label>爆款参考文案<textarea rows={5} value={props.referenceScript} onChange={e=>props.onReferenceChange(e.target.value)} placeholder="粘贴完整爆款口播，至少30字"/><small>{props.referenceScript.length} 字</small></label>}
        <label>产品名称<input value={props.form.product} onChange={e=>props.onUpdate("product",e.target.value)} /></label>
        <label>核心卖点<textarea rows={4} value={props.form.sellingPoints} onChange={e=>props.onUpdate("sellingPoints",e.target.value)} /></label>
        <label>目标用户<input value={props.form.audience} onChange={e=>props.onUpdate("audience",e.target.value)} /></label>
        <div className="studio-pair"><label>目标市场<input value={props.form.country} onChange={e=>props.onUpdate("country",e.target.value)} /></label><label>输出语言<select value={props.form.language} onChange={e=>props.onUpdate("language",e.target.value)}>{props.languages.map(x=><option key={x}>{x}</option>)}</select></label></div>
        <label>发布平台<div className="studio-segments">{["TikTok","Reels","Shorts"].map(x=><button type="button" className={platform===x?"selected":""} onClick={()=>setPlatform(x)} key={x}>{x}</button>)}</div><small>平台偏好已记录；生成 Prompt 暂未接入</small></label>
        <div className="studio-pair"><label>视频时长<select value={props.form.duration} onChange={e=>props.onUpdate("duration",e.target.value)}><option value="30">30秒</option><option value="45">45秒</option><option value="60">60秒</option></select></label><label>促销信息<input value={props.form.offer} onChange={e=>props.onUpdate("offer",e.target.value)} /></label></div>
        <label>补充要求 <em className="pending-badge">待接入</em><textarea rows={3} value={briefNotes} onChange={e=>setBriefNotes(e.target.value)} placeholder="本轮仅保存页面状态，不发送给AI" /></label>
      </aside>

      <main className="studio-center">
        <div className="studio-editor-head"><div><span>02 · AI SCRIPT EDITOR</span><h2>{script?.title || "等待生成脚本"}</h2></div><div><button disabled={!script} onClick={()=>script&&props.onCopy(script.narration)}>复制全文</button><button disabled={!script} onClick={()=>script&&props.onExport(script)}>导出 Excel</button></div></div>
        {!script?<div className="studio-empty"><div>✦</div><h2>从 Brief 开始生成专业脚本</h2><p>生成结果会按 Hook、冲突、演示、卖点、CTA 与拍摄建议拆分呈现。</p><button disabled={!props.inputReady||props.loading||props.raceLoading} onClick={props.onGenerate}>{props.loading?"正在生成…":props.mode==="replicate"?"开始复刻脚本":"生成单条脚本"}</button></div>:<>
          <section className="editor-summary"><div><span>{script.language}</span><span>{script.style}</span><span>{script.country}</span>{script.aiGenerated&&<span className="ai-badge">AI Provider</span>}</div><strong>{score?.total}<small>/100</small></strong></section>
          <div className="script-sections">{sections.map(([title,content])=><article key={title} className={locked[title]?"locked":""}><header><div><span>{title}</span>{locked[title]&&<b>已锁定</b>}</div><div><button onClick={()=>props.onCopy(content)}>复制</button><button onClick={()=>setLocked(v=>({...v,[title]:!v[title]}))}>{locked[title]?"解锁":"锁定"}</button></div></header><p>{content}</p><footer><button disabled title="局部 AI 重写接口待接入">重写</button><button disabled title="局部 AI 重写接口待接入">缩短</button><button disabled title="局部 AI 重写接口待接入">加强 Hook</button><button disabled title="局部 AI 重写接口待接入">更自然 / KOC</button><em>局部 AI 待接入</em></footer></article>)}</div>
          <section className="score-compliance"><div><h3>真实评分</h3><div className="metric-row"><span>Hook</span><b>{score?.hook}/25</b></div><div className="metric-row"><span>结构 / 节奏</span><b>{score?.structure}/25</b></div><div className="metric-row"><span>证明力</span><b>{score?.proof}/22</b></div><div className="metric-row"><span>转化引导</span><b>{score?.conversion}/20</b></div><div className="metric-row unavailable"><span>留存 / 自然度 / 卖点清晰度</span><b>— 待接入</b></div></div><div><h3>合规检测</h3><div className="risk-summary"><b className={hits.some(x=>x.level==="高")?"high":hits.some(x=>x.level==="中")?"medium":"low"}>{hits.length?`${hits.length} 处命中`:"低风险"}</b><span>基于现有规则库</span></div>{hits.slice(0,3).map((hit,index)=><p className="risk-hit" key={`${hit.term}-${index}`}><strong>{hit.level} · {hit.term}</strong><span>{hit.replacement}</span></p>)}</div></section>
        </>}

        <section className="race-arena"><header><div><span>03 · CREATIVE RACE</span><h2>5 条创意赛马</h2><p>真实调用现有 5 条生成能力；差异化质量留待后续 Prompt 阶段优化。</p></div><button disabled={!props.inputReady||props.loading||props.raceLoading} onClick={props.onGenerateRace}>{props.raceLoading?"正在生成 5 条…":"✦ 生成 5 条赛马稿"}</button></header>{props.raceResults.length===0?<div className="race-empty">A / B / C / D / E 版本将在这里并排对比</div>:<div className="race-cards">{props.raceResults.map((item,index)=>{const s=props.scoreScript(item);const risks=checkCompliance(item.narration);return <article className={script===item?"adopted":""} key={`${item.title}-${index}`}><header><b>{versions[index]}</b><span>{s.total}分</span></header><h3>{item.hook}</h3><dl><div><dt>创意方向</dt><dd>{item.title}</dd></div><div><dt>框架</dt><dd>{props.form.framework}</dd></div><div><dt>风格</dt><dd>{item.style}</dd></div></dl><p>{item.narration}</p><div className="race-status"><span className={risks.length?"risk":"safe"}>{risks.length?`${risks.length}处风险`:"低风险"}</span><span>已存历史</span></div><footer><button className="primary" onClick={()=>props.onAdopt(item)}>{script===item?"已采用":"采用"}</button><button className={compare.includes(index)?"selected":""} onClick={()=>setCompare(v=>v.includes(index)?v.filter(x=>x!==index):v.length<2?[...v,index]:[v[1],index])}>对比</button></footer></article>})}</div>}</section>

        <footer className="pipeline-bar"><div><span>当前版本</span><b>V1</b><button disabled>V2</button><button disabled>V3</button></div><div><button disabled className="disabled-action">保存到项目 · 待接入</button><button disabled={!script} onClick={()=>props.onNavigate("voice")}>发送到 AI 配音</button><button className="pipeline-primary" disabled={!script} onClick={()=>props.onNavigate("director")}>进入 AI 导演 →</button></div></footer>
      </main>

      <aside className="studio-column studio-settings">
        <div className="studio-card-head"><div><span>AI CONTROLS</span><h2>AI 创作设置</h2></div><small className={props.aiConnected?"provider-on":"provider-off"}>{props.aiConnected?"Provider 在线":"本地模式"}</small></div>
        <label>脚本框架<select value={props.form.framework} onChange={e=>props.onUpdate("framework",e.target.value)}><option>智能随机</option>{[...new Set(props.frameworks.map(x=>x.group))].map(group=><optgroup label={group} key={group}>{props.frameworks.filter(x=>x.group===group).map(x=><option key={x.name}>{x.name}</option>)}</optgroup>)}</select></label>
        <label>Hook 类型 <em className="pending-badge">待接入</em><select value={hookType} onChange={e=>setHookType(e.target.value)}><option>智能匹配</option><option>冲突反常识</option><option>悬念揭秘</option><option>结果前置</option><option>痛点提问</option></select><small>仅 UI 预留，当前不改变 Prompt</small></label>
        <label>表达风格<select value={props.form.style} onChange={e=>props.onUpdate("style",e.target.value)}>{props.styles.map(x=><option key={x}>{x}</option>)}</select></label>
        <label>创意强度 <em className="pending-badge">待接入</em><div className="studio-segments">{["稳健","平衡","大胆"].map(x=><button type="button" className={creativeStrength===x?"selected":""} onClick={()=>setCreativeStrength(x)} key={x}>{x}</button>)}</div></label>
        <label>生成数量<div className="quantity-options"><button className="selected" onClick={props.onGenerate}>1 条</button><button onClick={props.onGenerateRace}>5 条赛马</button></div></label>
        <div className="studio-pair"><label>语言<select value={props.form.language} onChange={e=>props.onUpdate("language",e.target.value)}>{props.languages.map(x=><option key={x}>{x}</option>)}</select></label><label>时长<select value={props.form.duration} onChange={e=>props.onUpdate("duration",e.target.value)}><option value="30">30秒</option><option value="45">45秒</option><option value="60">60秒</option></select></label></div>
        <label>参考爆款<div className="reference-state"><i className={props.mode==="replicate"&&props.referenceScript.length>=30?"active":""}/><span>{props.mode==="replicate"?props.referenceScript.length>=30?"已连接参考文案":"等待至少30字":"当前未启用"}</span></div></label>
        <div className="provider-card"><span>PROVIDER STATUS</span><strong>{props.aiConnected?"现有 AI Provider 已连接":"稳定本地脚本引擎"}</strong><p>保持现有 API 与 Prompt，不在 Step 2 更换模型。</p></div>
        {props.error&&<p className="studio-error">{props.error}</p>}
        <button className="studio-generate" disabled={!props.inputReady||props.loading||props.raceLoading} onClick={props.onGenerate}>{props.loading?"正在生成…":"✦ 生成单条脚本"}</button>
        <button className="studio-race" disabled={!props.inputReady||props.loading||props.raceLoading} onClick={props.onGenerateRace}>{props.raceLoading?"赛马生成中…":"生成 5 条赛马稿"}</button>
      </aside>
    </div>
  </section>;
}
