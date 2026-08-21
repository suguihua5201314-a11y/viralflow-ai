"use client";

import { useMemo, useState } from "react";
import { checkCompliance, type ComplianceHit } from "./compliance-rules";

export type StudioScene = { time: string; visual: string; line: string; edit: string };
export type StudioScript = { id?: number; title: string; product: string; language: string; country: string; style: string; hook: string; alternateHooks: string[]; narration: string; scenes: StudioScene[]; createdAt?: string; aiGenerated?: boolean; creativeAngle?:string; hookType?:string; framework?:string; conflict?:string; productReveal?:string; proof?:string; sellingPoints?:string; cta?:string; shootingSuggestion?:string; scenario?:string; proofMechanism?:string; ctaStyle?:string };
export type StudioProduct = { id:number; name:string; brand:string; category:string; sellingPoints:string; parameters:string; bannedWords:string; markets:string; audience:string; price:string; offer:string; notes:string; updatedAt:string };
export type StudioForm = { product:string; sellingPoints:string; audience:string; country:string; language:string; style:string; framework:string; duration:string; offer:string };
export type StudioScore = { total:number; hook:number; structure:number; proof:number; conversion:number; risks:number };
export type GenerationControls = { platform:string; additionalRequirements:string; scenario:string; creationMode:string; hookStrategy:string; creativity:string; outputCount:1|5 };

type Props = {
  mode:"create"|"replicate"; form:StudioForm; products:StudioProduct[]; languages:string[]; styles:string[];
  frameworks:Array<{name:string;group:string}>; referenceScript:string; result:StudioScript|null; raceResults:StudioScript[];
  loading:boolean; raceLoading:boolean; inputReady:boolean; error:string; aiConnected:boolean;
  historyCount:number; onUpdate:(key:keyof StudioForm,value:string)=>void; onUseProduct:(product:StudioProduct)=>void;
  onReferenceChange:(value:string)=>void; onGenerate:(controls:GenerationControls)=>void; onGenerateRace:(controls:GenerationControls)=>void; onAdopt:(script:StudioScript)=>void;
  onDraftChange:(script:StudioScript)=>void; onSaveVersion:(script:StudioScript)=>StudioScript;
  onCopy:(text:string)=>void; onExport:(script:StudioScript)=>void; onNavigate:(view:"history"|"director"|"voice"|"products"|"library")=>void;
  scoreScript:(script:StudioScript)=>StudioScore;
};

type EditorBlock = { key:string; label:string; type:string; duration:string; text:string };
type SavedVersion = { label:string; script:StudioScript; blocks:EditorBlock[] };
const letters = ["A","B","C","D","E"];
const creationModes = ["KOC / UGC","测评","强冲突","Storytelling","产品演示"];
const hookStrategies = ["好奇","冲突","结果前置","反常识","问题","视觉钩子"];
const compactFrameworks = ["AIDA","PAS","对比","懊悔","问题 → 冲突 → 反转 → 证明 → CTA"];

function buildBlocks(script:StudioScript, sellingPoints:string):EditorBlock[] {
  const scenes = script.scenes || [];
  return [
    { key:"hook", label:"HOOK", type:"前 3 秒", duration:"0–3s", text:script.hook || scenes[0]?.line || "" },
    { key:"conflict", label:"冲突 / 问题", type:"观看理由", duration:"3–8s", text:script.conflict || scenes[1]?.line || "当前脚本未单独标注冲突" },
    { key:"product", label:"产品出现", type:"产品入场", duration:"8–15s", text:script.productReveal || scenes[2]?.line || scenes[0]?.line || script.product },
    { key:"proof", label:"演示 / 证明", type:"动作证明", duration:"15–21s", text:script.proof || scenes.slice(2,-2).map(x=>x.line).filter(Boolean).join(" ") || "当前脚本未单独标注演示" },
    { key:"points", label:"卖点递进", type:"价值建立", duration:"21–26s", text:script.sellingPoints || scenes.at(-2)?.line || sellingPoints },
    { key:"cta", label:"CTA", type:"行动引导", duration:"26–30s", text:script.cta || scenes.at(-1)?.line || "当前脚本未单独标注 CTA" },
  ];
}

function withBlocks(script:StudioScript, blocks:EditorBlock[]):StudioScript {
  return { ...script, hook:blocks[0]?.text || script.hook, narration:blocks.map(block=>block.text.trim()).filter(Boolean).join(" ") };
}

function scaleTime(value:number, total:number) { return Math.round(value * total / 30); }

function MarkedCopy({text,hits,onSelect}:{text:string;hits:ComplianceHit[];onSelect:(hit:ComplianceHit)=>void}) {
  if (!hits.length) return <>{text}</>;
  const terms = hits.map(hit=>hit.term).sort((a,b)=>b.length-a.length);
  const pattern = new RegExp(`(${terms.map(term=>term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")})`,"gi");
  return <>{text.split(pattern).map((part,index)=>{const hit=hits.find(item=>item.term.toLowerCase()===part.toLowerCase());return hit?<button type="button" className={`inline-risk risk-${hit.level}`} key={`${part}-${index}`} onClick={()=>onSelect(hit)}>{part}</button>:part})}</>;
}

export default function ScriptStudio(props:Props) {
  const [platform,setPlatform] = useState("TikTok");
  const [briefNotes,setBriefNotes] = useState("");
  const [scene,setScene] = useState("");
  const [showMore,setShowMore] = useState(false);
  const [creationMode,setCreationMode] = useState("KOC / UGC");
  const [hookStrategy,setHookStrategy] = useState("好奇");
  const [creativity,setCreativity] = useState("平衡");
  const [outputCount,setOutputCount] = useState<1|5>(1);
  const [locked,setLocked] = useState<Record<string,boolean>>({});
  const [editing,setEditing] = useState<string|null>(null);
  const [blocks,setBlocks] = useState<EditorBlock[]>(()=>props.result?buildBlocks(props.result,props.form.sellingPoints):[]);
  const [versions,setVersions] = useState<SavedVersion[]>(()=>props.result?[{label:"V1",script:props.result,blocks:buildBlocks(props.result,props.form.sellingPoints)}]:[]);
  const [activeVersion,setActiveVersion] = useState(0);
  const [compare,setCompare] = useState<number[]>([]);
  const [compareOpen,setCompareOpen] = useState(false);
  const [selectedRisk,setSelectedRisk] = useState<ComplianceHit|null>(null);
  const [savedNotice,setSavedNotice] = useState(false);
  const script = props.result;

  const draftScript = useMemo(()=>script ? withBlocks(script,blocks) : null,[script,blocks]);
  const score = draftScript ? props.scoreScript(draftScript) : null;
  const hits = useMemo(()=>draftScript ? checkCompliance(draftScript.narration) : [],[draftScript]);
  const currentStep = props.raceResults.length ? 3 : draftScript ? 2 : 0;
  const totalDuration = Number.parseInt(props.form.duration,10) || 30;
  const pacing = [["Hook",0,3,"#5f5cf6"],["冲突",3,8,"#7772ee"],["产品",8,15,"#4f85dd"],["演示 / 卖点",15,24,"#35a1b7"],["CTA",24,30,"#263f78"]] as const;
  const generationSummary = `${props.form.country} · ${props.form.language} · ${platform} · ${totalDuration}s · ${creationMode} · ${props.form.framework} · ${outputCount} ${outputCount===1?"version":"versions"}`;
  const controls=(count:1|5):GenerationControls=>({platform,additionalRequirements:briefNotes,scenario:scene,creationMode,hookStrategy,creativity,outputCount:count});

  function updateBlock(key:string,text:string) {
    const next=blocks.map(block=>block.key===key?{...block,text}:block);
    setBlocks(next); if (script) props.onDraftChange(withBlocks(script,next));
  }
  function saveVersion() {
    if (!draftScript) return;
    const saved=props.onSaveVersion(draftScript);
    const nextLabel=`V${versions.length+1}`;
    setVersions(prev=>[...prev,{label:nextLabel,script:saved,blocks:blocks.map(block=>({...block}))}]);
    setActiveVersion(versions.length); setSavedNotice(true); window.setTimeout(()=>setSavedNotice(false),1800);
  }
  function openVersion(index:number) {
    const version=versions[index]; if(!version)return;
    setActiveVersion(index); setBlocks(version.blocks.map(block=>({...block}))); props.onDraftChange(version.script);
  }
  function adoptRace(item:StudioScript) {
    props.onAdopt(item); setCompareOpen(false); setCompare([]); setActiveVersion(0);
    document.querySelector(".studio-editor-head")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function toggleCompare(index:number) { setCompare(current=>current.includes(index)?current.filter(x=>x!==index):current.length<2?[...current,index]:[current[1],index]); }
  const compareItems=compare.map(index=>({index,script:props.raceResults[index]})).filter(item=>item.script);

  return <section className="script-studio">
    <header className="studio-titlebar"><div><span className="studio-kicker">AI SCRIPT STUDIO</span><h1>AI 脚本生成工作台</h1><p>用 Brief 驱动创意赛马，在同一个编辑器完成改稿、合规与下一步制作。</p></div><div className="studio-title-actions"><button onClick={()=>props.onNavigate("history")}>历史脚本 <b>{props.historyCount}</b></button><span className={props.aiConnected?"provider-chip online":"provider-chip"}><i/>{props.aiConnected?"Provider 在线":"本地模式"}</span></div></header>
    <nav className="studio-workflow" aria-label="脚本工作流">{["产品与 Brief","创意设置","AI 生成","赛马筛选","合规确认"].map((step,index)=><div key={step} className={index<=currentStep?"done":""}><span>{index<currentStep?"✓":index+1}</span><b>{step}</b><i/></div>)}</nav>
    <div className="studio-grid">
      <aside className="studio-column studio-brief">
        <div className="studio-card-head"><div><span>CREATIVE BRIEF</span><h2>创作 Brief</h2></div><small>真实输入</small></div>
        <section className="brief-group"><header><b>产品</b><span>01</span></header><label>产品知识库<select value="" onChange={e=>{const item=props.products.find(x=>String(x.id)===e.target.value);if(item)props.onUseProduct(item)}}><option value="">选择产品自动填充…</option>{props.products.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>产品名称<input value={props.form.product} onChange={e=>props.onUpdate("product",e.target.value)}/></label><label>核心卖点<textarea rows={3} value={props.form.sellingPoints} onChange={e=>props.onUpdate("sellingPoints",e.target.value)}/></label></section>
        <section className="brief-group"><header><b>受众</b><span>02</span></header><label>目标市场<input value={props.form.country} onChange={e=>props.onUpdate("country",e.target.value)}/></label><label>目标用户<input value={props.form.audience} onChange={e=>props.onUpdate("audience",e.target.value)}/></label>{showMore&&<label>使用场景 <em className="connected-badge">已接入</em><input value={scene} onChange={e=>setScene(e.target.value)} placeholder="例如：通勤、旅行、开箱"/></label>}</section>
        <section className="brief-group"><header><b>内容</b><span>03</span></header><label>发布平台<div className="studio-segments">{["TikTok","Reels","Shorts"].map(x=><button type="button" className={platform===x?"selected":""} onClick={()=>setPlatform(x)} key={x}>{x}</button>)}</div><small>平台节奏规则已进入生成 Prompt</small></label><div className="studio-pair"><label>语言<select value={props.form.language} onChange={e=>props.onUpdate("language",e.target.value)}>{props.languages.map(x=><option key={x}>{x}</option>)}</select></label><label>时长<select value={props.form.duration} onChange={e=>props.onUpdate("duration",e.target.value)}><option value="30">30秒</option><option value="45">45秒</option><option value="60">60秒</option></select></label></div>{showMore&&<label>促销信息<input value={props.form.offer} onChange={e=>props.onUpdate("offer",e.target.value)}/></label>}</section>
        <section className="brief-group"><header><b>参考</b><span>04</span></header>{props.mode==="replicate"&&<label>爆款参考文案<textarea rows={4} value={props.referenceScript} onChange={e=>props.onReferenceChange(e.target.value)} placeholder="粘贴完整爆款口播，至少 30 字"/><small>{props.referenceScript.length} 字</small></label>}<button className="reference-button" onClick={()=>props.onNavigate("library")}>选择爆款案例 <em>从案例库</em></button>{showMore&&<label>补充要求 <em className="connected-badge">已接入</em><textarea rows={3} value={briefNotes} onChange={e=>setBriefNotes(e.target.value)} placeholder="例如：避免强销售语气，增加通勤场景"/></label>}</section>
        <button className="more-settings" onClick={()=>setShowMore(value=>!value)}>{showMore?"收起更多设置":"更多设置"}<span>{showMore?"⌃":"⌄"}</span></button>
      </aside>

      <main className="studio-center">
        <div className="studio-editor-head"><div><span>AI SCRIPT EDITOR</span><h2>{draftScript?.title || "Script Editor"}</h2></div><div className="version-tabs"><span>版本</span>{versions.map((version,index)=><button className={activeVersion===index?"active":""} key={version.label} onClick={()=>openVersion(index)}>{version.label}</button>)}<button onClick={()=>props.onNavigate("history")}>历史版本</button></div><div className="editor-actions"><button disabled={!draftScript} onClick={()=>draftScript&&props.onCopy(draftScript.narration)}>复制全文</button><button disabled={!draftScript} onClick={()=>draftScript&&props.onExport(draftScript)}>导出</button></div></div>
        {!draftScript?<div className="studio-empty"><div className="empty-orb">✦</div><span>AI CREATIVE WORKSPACE</span><h2>准备创作下一条爆款</h2><p>选择产品并设置创作方向，ViralFlow AI 将生成多个差异化脚本方案。</p><div className="empty-shortcuts"><button onClick={()=>props.onNavigate("products")}>从产品知识库开始</button><button onClick={()=>props.onNavigate("library")}>参考爆款案例</button><button onClick={()=>document.querySelector<HTMLInputElement>(".studio-brief input")?.focus()}>直接填写 Brief</button></div><button className="empty-primary" disabled={!props.inputReady||props.loading||props.raceLoading} onClick={()=>props.onGenerate(controls(1))}>{props.loading?"正在生成…":"✦ 生成第一条脚本"}</button></div>:<>
          <section className="pacing-card"><header><div><span>SCRIPT PACING</span><b>{totalDuration}s 节奏时间轴</b></div><small>随视频时长动态适配</small></header><div className="pacing-bar">{pacing.map(([label,start,end,color])=><div key={label} style={{width:`${(end-start)/30*100}%`,background:color}}><b>{scaleTime(start,totalDuration)}–{scaleTime(end,totalDuration)}s</b><span>{label}</span></div>)}</div></section>
          <section className="editor-status"><div><span>{draftScript.language}</span><span>{draftScript.style}</span><span>{draftScript.country}</span>{draftScript.aiGenerated&&<span className="ai-badge">AI Provider</span>}</div><div className={hits.length?"compliance-state warning":"compliance-state clear"}><i/>{hits.length?`发现 ${hits.length} 项风险`:"合规：通过"}</div><strong>综合 {score?.total}</strong></section>
          <div className="script-blocks">{blocks.map((block,index)=>{const blockHits=checkCompliance(block.text);return <article key={block.key} className={`${locked[block.key]?"locked":""} ${editing===block.key?"editing":""}`}><aside><b>{String(index+1).padStart(2,"0")}</b><i/></aside><div className="block-main"><header><div><span>{block.label}</span><em>{block.type}</em><small>{block.duration}</small></div><div><button onClick={()=>setEditing(editing===block.key?null:block.key)}>{editing===block.key?"完成":"编辑"}</button><button onClick={()=>props.onCopy(block.text)}>复制</button><button className={locked[block.key]?"active":""} onClick={()=>setLocked(value=>({...value,[block.key]:!value[block.key]}))}>{locked[block.key]?"已锁定":"锁定"}</button><button disabled title="局部重写接口待接入">重写</button></div></header>{editing===block.key&&!locked[block.key]?<textarea aria-label={`编辑 ${block.label}`} value={block.text} onChange={e=>updateBlock(block.key,e.target.value)}/>:<p><MarkedCopy text={block.text} hits={blockHits} onSelect={setSelectedRisk}/></p>}<footer><span>快捷 AI</span>{["Hook 更强","更自然","更像 KOC","缩短","加强冲突","换一种表达"].map(action=><button key={action} disabled title="当前 AI Provider 尚未支持局部重写">{action}</button>)}<em>待接入</em></footer>{blockHits.length>0&&<div className="block-risk-row">{blockHits.map((hit,hitIndex)=><button key={`${hit.term}-${hitIndex}`} onClick={()=>setSelectedRisk(hit)}><i className={`level-${hit.level}`}/>{hit.level}风险 · {hit.term}</button>)}</div>}</div></article>})}</div>
          <section className="insight-grid"><article className="score-panel"><header><div><span>REAL SCORING</span><h3>脚本评分</h3></div><strong>{score?.total}<small>/100</small></strong></header><div className="score-metrics"><div><span>Hook</span><i><b style={{width:`${(score?.hook||0)/25*100}%`}}/></i><em>{score?.hook}/25</em></div><div><span>结构 / 节奏</span><i><b style={{width:`${(score?.structure||0)/25*100}%`}}/></i><em>{score?.structure}/25</em></div><div><span>证明力</span><i><b style={{width:`${(score?.proof||0)/22*100}%`}}/></i><em>{score?.proof}/22</em></div><div><span>转化引导</span><i><b style={{width:`${(score?.conversion||0)/20*100}%`}}/></i><em>{score?.conversion}/20</em></div></div><div className="score-diagnosis"><p><b>优势</b>{(score?.hook||0)>=22?"Hook 进入快，开场信息明确":"现有结构完整，可继续强化开场"}</p><p><b>建议</b>{(score?.conversion||0)>=18?"转化路径明确，注意保持自然表达":"补充真实购买理由，让 CTA 更自然"}</p></div><div className="pending-metrics">留存 · 自然度 · 卖点清晰度 <em>待接入</em></div></article><article className="compliance-panel"><header><div><span>COMPLIANCE</span><h3>合规检测</h3></div><b className={hits.length?"warning":"clear"}>{hits.length?`${hits.length} 项风险`:"通过"}</b></header>{hits.length===0?<div className="compliance-clear"><i>✓</i><div><b>未命中已知风险词</b><p>仍需人工检查画面、测试条件和促销真实性。</p></div></div>:<div className="compliance-list">{hits.slice(0,4).map((hit,index)=><button key={`${hit.term}-${index}`} onClick={()=>setSelectedRisk(hit)}><i className={`level-${hit.level}`}/><div><b>{hit.level}风险 · {hit.term}</b><span>{hit.category} · {hit.riskType}</span></div><em>查看 →</em></button>)}</div>}</article></section>
        </>}

        <section className="race-arena"><header><div><span>CREATIVE RACE</span><h2>5 条创意赛马</h2><p>先生成不同 Creative Concept，再分别完成脚本并执行重复度检查。</p></div><div><span className="race-count">已选 {compare.length}/2</span><button disabled={compare.length!==2} onClick={()=>setCompareOpen(true)}>对比所选</button><button className="race-generate" disabled={!props.inputReady||props.loading||props.raceLoading} onClick={()=>{setOutputCount(5);props.onGenerateRace(controls(5))}}>{props.raceLoading?"正在生成 5 条…":"✦ 生成 5 条赛马稿"}</button></div></header>{props.raceResults.length===0?<div className="race-empty"><div>{letters.map(letter=><span key={letter}>{letter}</span>)}</div><b>候选创意会在这里集中呈现</b><p>每张卡只突出 Hook、方向、框架、真实评分和合规状态。</p></div>:<div className="race-cards">{props.raceResults.map((item,index)=>{const itemScore=props.scoreScript(item);const risks=checkCompliance(item.narration);return <article className={`${script===item?"adopted":""} ${compare.includes(index)?"comparing":""}`} key={`${item.title}-${index}`} onClick={()=>adoptRace(item)}><header><b>{letters[index]}</b><div><span>{itemScore.total}</span><small>综合</small></div></header><span className="direction">{item.creativeAngle || item.title}</span><h3>{item.hook}</h3><dl><div><dt>Hook 类型</dt><dd>{item.hookType || hookStrategy}</dd></div><div><dt>框架</dt><dd>{item.framework || props.form.framework}</dd></div><div><dt>场景</dt><dd>{item.scenario || item.style}</dd></div></dl><div className="race-status"><span className={risks.length?"risk":"safe"}>{risks.length?`${risks.length} 项风险`:"合规通过"}</span>{script===item&&<span className="adopted-state">当前采用</span>}</div><footer><button className="primary" onClick={e=>{e.stopPropagation();adoptRace(item)}}>{script===item?"已采用":"采用"}</button><button className={compare.includes(index)?"selected":""} onClick={e=>{e.stopPropagation();toggleCompare(index)}}>{compare.includes(index)?"已选对比":"对比"}</button></footer></article>})}</div>}</section>
        <footer className="pipeline-bar"><div className="pipeline-context"><span>当前脚本</span><b>{versions[activeVersion]?.label||"V1"}</b><small>{draftScript?.title||"尚未生成"}</small>{savedNotice&&<em>✓ 已保存为新版本</em>}</div><div><button disabled={!draftScript} onClick={saveVersion}>保存脚本</button><button disabled={!draftScript} onClick={()=>document.querySelector(".compliance-panel")?.scrollIntoView({behavior:"smooth"})}>合规检测</button><button disabled={!draftScript} onClick={()=>props.onNavigate("voice")}>发送到 AI 配音</button><button className="pipeline-primary" disabled={!draftScript} onClick={()=>props.onNavigate("director")}>进入 AI 导演 →</button></div></footer>
      </main>

      <aside className="studio-column studio-settings"><div className="studio-card-head"><div><span>AI CONTROLS</span><h2>AI 创作设置</h2></div><small className={props.aiConnected?"provider-on":"provider-off"}>{props.aiConnected?"在线":"本地"}</small></div><section className="setting-group"><header><b>创作模式</b><span>已接入</span></header><div className="choice-grid">{creationModes.map(mode=><button className={creationMode===mode?"selected":""} onClick={()=>setCreationMode(mode)} key={mode}>{mode}</button>)}</div></section><section className="setting-group"><header><b>Hook Strategy</b><span>已接入</span></header><div className="choice-grid three">{hookStrategies.map(strategy=><button className={hookStrategy===strategy?"selected":""} onClick={()=>setHookStrategy(strategy)} key={strategy}>{strategy}</button>)}</div></section><section className="setting-group"><header><b>Framework</b><span>已接入</span></header><select value={props.form.framework} onChange={e=>props.onUpdate("framework",e.target.value)}><option>智能随机</option>{compactFrameworks.map(name=><option key={name}>{name}</option>)}{props.frameworks.filter(item=>!compactFrameworks.includes(item.name)).map(item=><option key={item.name}>{item.name}</option>)}</select></section><section className="setting-group"><header><b>Creativity</b><span>已接入</span></header><div className="studio-segments">{["稳定","平衡","激进"].map(value=><button className={creativity===value?"selected":""} onClick={()=>setCreativity(value)} key={value}>{value}</button>)}</div></section><section className="setting-group"><header><b>Output</b><span>已接入</span></header><div className="studio-pair"><label>时长<select value={props.form.duration} onChange={e=>props.onUpdate("duration",e.target.value)}><option value="30">30s</option><option value="45">45s</option><option value="60">60s</option></select></label><label>语言<select value={props.form.language} onChange={e=>props.onUpdate("language",e.target.value)}>{props.languages.map(x=><option key={x}>{x}</option>)}</select></label></div><label>生成数量<div className="studio-segments"><button className={outputCount===1?"selected":""} onClick={()=>setOutputCount(1)}>1 条</button><button className={outputCount===5?"selected":""} onClick={()=>setOutputCount(5)}>5 条赛马</button></div></label></section><div className="provider-card"><span>PROVIDER STATUS</span><strong>{props.aiConnected?"现有 AI Provider 已连接":"稳定本地脚本引擎"}</strong><p>创作模式、Hook、框架、创意强度与 Brief 参数均会进入现有生成链路。</p></div><div className="generation-summary"><span>GENERATION SUMMARY</span><p>{generationSummary}</p></div>{props.error&&<p className="studio-error">{props.error}</p>}<button className="studio-generate" disabled={!props.inputReady||props.loading||props.raceLoading} onClick={()=>{setOutputCount(1);props.onGenerate(controls(1))}}>{props.loading?"正在生成…":"✦ 生成单条脚本"}</button><button className="studio-race" disabled={!props.inputReady||props.loading||props.raceLoading} onClick={()=>{setOutputCount(5);props.onGenerateRace(controls(5))}}>{props.raceLoading?"赛马生成中…":"生成 5 条赛马稿"}</button></aside>
    </div>

    {selectedRisk&&<div className="risk-popover" role="dialog" aria-modal="true" aria-label="合规风险详情"><button className="risk-backdrop" aria-label="关闭" onClick={()=>setSelectedRisk(null)}/><article><header><div><span className={`risk-label risk-${selectedRisk.level}`}>{selectedRisk.level}风险</span><small>{selectedRisk.riskType}</small></div><button onClick={()=>setSelectedRisk(null)}>×</button></header><h3>{selectedRisk.term}</h3><dl><div><dt>原表达</dt><dd>{selectedRisk.term}</dd></div><div><dt>风险原因</dt><dd>{selectedRisk.suggestion}</dd></div><div><dt>推荐安全表达</dt><dd>{selectedRisk.replacement}</dd></div></dl><button onClick={()=>{props.onCopy(selectedRisk.replacement);setSelectedRisk(null)}}>复制安全表达</button></article></div>}
    {compareOpen&&compareItems.length===2&&<div className="compare-modal" role="dialog" aria-modal="true" aria-label="赛马版本对比"><button className="compare-backdrop" aria-label="关闭" onClick={()=>setCompareOpen(false)}/><article><header><div><span>COMPARE MODE</span><h2>{letters[compareItems[0].index]} vs {letters[compareItems[1].index]}</h2><p>并排比较真实脚本内容与现有评分。</p></div><button onClick={()=>setCompareOpen(false)}>×</button></header><div className="compare-columns">{compareItems.map(({index,script:item})=>{const itemScore=props.scoreScript(item);const itemHits=checkCompliance(item.narration);const itemBlocks=buildBlocks(item,props.form.sellingPoints);return <section key={index}><div className="compare-version"><b>{letters[index]}</b><div><h3>{item.title}</h3><span>{item.style} · {props.form.framework}</span></div><strong>{itemScore.total}</strong></div>{[["Hook",item.hook],["创意角度",item.title],["内容结构",itemBlocks.map(block=>block.label).join(" → ")],["视频节奏",pacing.map(([label,start,end])=>`${scaleTime(start,totalDuration)}–${scaleTime(end,totalDuration)}s ${label}`).join(" · ")],["核心卖点",itemBlocks.find(block=>block.key==="points")?.text||props.form.sellingPoints],["CTA",itemBlocks.find(block=>block.key==="cta")?.text||""]].map(([label,value])=><div className="compare-row" key={label}><span>{label}</span><p>{value}</p></div>)}<div className="compare-scores"><div><span>Hook</span><b>{itemScore.hook}/25</b></div><div><span>结构 / 节奏</span><b>{itemScore.structure}/25</b></div><div><span>证明力</span><b>{itemScore.proof}/22</b></div><div><span>转化</span><b>{itemScore.conversion}/20</b></div><div><span>自然度 / 留存</span><em>待接入</em></div><div><span>合规风险</span><b>{itemHits.length} 项</b></div></div><button className="adopt-compare" onClick={()=>{adoptRace(item);setCompareOpen(false)}}>采用 {letters[index]}</button></section>})}</div></article></div>}
  </section>;
}
