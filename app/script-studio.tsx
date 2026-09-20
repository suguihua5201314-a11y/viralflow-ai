"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { checkCompliance, type ComplianceHit } from "./compliance-rules";
import { mergeCopilotBlocks, type CopilotBlock, type CopilotBlockKey } from "./copilot-core";
import type {ProviderId,ProviderRunMetadata,ProviderStatus} from "./provider-types";
import ScriptDocument from "./components/script/script-document";
import { Inspector, InspectorSection } from "./components/workspace/workspace";
import WorkspaceState from "./components/ui/workspace-state";
import {notifyWorkspace} from "./components/ui/workspace-feedback";
import {appendScriptVariant, variantIdentity, type ScriptVariant} from "./script-variants";

export type StudioScene = { time: string; visual: string; line: string; edit: string };
export type StudioScript = { id?: number; title: string; product: string; language: string; country: string; style: string; hook: string; alternateHooks: string[]; narration: string; scenes: StudioScene[]; createdAt?: string; aiGenerated?: boolean; creativeAngle?:string; hookType?:string; framework?:string; conflict?:string; productReveal?:string; proof?:string; sellingPoints?:string; cta?:string; shootingSuggestion?:string; scenario?:string; proofMechanism?:string; ctaStyle?:string; providerRequested?:ProviderId;providerUsed?:ProviderId|"local";fallbackUsed?:boolean;providerErrorType?:string|null;responseTimeMs?:number|null };
export type StudioProduct = { id:number; name:string; brand:string; category:string; sellingPoints:string; parameters:string; bannedWords:string; markets:string; audience:string; price:string; offer:string; notes:string; updatedAt:string };
export type StudioForm = { product:string; sellingPoints:string; audience:string; country:string; language:string; style:string; framework:string; duration:string; offer:string };
export type StudioScore = { total:number; hook:number; structure:number; proof:number; conversion:number; risks:number };
export type GenerationControls = { platform:string; additionalRequirements:string; scenario:string; creationMode:string; hookStrategy:string; creativity:string; outputCount:1|5;provider:ProviderId };

type Props = {
  mode:"create"|"replicate"; form:StudioForm; products:StudioProduct[]; languages:string[]; styles:string[];
  sellingPointKnowledge:Array<{product?:string;points?:string}>;
  frameworks:Array<{name:string;group:string}>; referenceScript:string; result:StudioScript|null; raceResults:StudioScript[];
  loading:boolean; raceLoading:boolean; inputReady:boolean; error:string; aiConnected:boolean;
  providerStatuses:Record<ProviderId,ProviderStatus>;selectedProvider:ProviderId;lastProviderRun:ProviderRunMetadata|null;onProviderChange:(provider:ProviderId)=>void;
  historyCount:number; onUpdate:(key:keyof StudioForm,value:string)=>void; onUseProduct:(product:StudioProduct)=>void;
  onReferenceChange:(value:string)=>void; onGenerate:(controls:GenerationControls)=>void; onGenerateRace:(controls:GenerationControls)=>void; onAdopt:(script:StudioScript)=>void;
  onDraftChange:(script:StudioScript)=>void; onSaveVersion:(script:StudioScript)=>StudioScript;
  onCopy:(text:string)=>void; onExport:(script:StudioScript)=>void; onNavigate:(view:"history"|"director"|"voice"|"products"|"library")=>void;
  scoreScript:(script:StudioScript)=>StudioScore;
};

type EditorBlock = CopilotBlock & { duration:string };
type SavedVersion = ScriptVariant<StudioScript,EditorBlock>;
type RewritePreview = { before:EditorBlock[]; after:EditorBlock[]; keys:CopilotBlockKey[]; action:string };
type UndoRewrite = { blocks:EditorBlock[]; label:string };
const letters = ["A","B","C","D","E"];
const creationModes = ["KOC / UGC","测评","强冲突","Storytelling","产品演示"];
const hookStrategies = ["好奇","冲突","结果前置","反常识","问题","视觉钩子"];
const compact内容框架s = ["AIDA","PAS","对比","懊悔","问题 → 冲突 → 反转 → 证明 → CTA"];

function buildBlocks(script:StudioScript, sellingPoints:string):EditorBlock[] {
  const scenes = script.scenes || [];
  return [
    { key:"hook", label:"HOOK", type:"前 3 秒", duration:"0–3s", text:script.hook || scenes[0]?.line || "" },
    { key:"conflict", label:"PROBLEM", type:"观看理由", duration:"3–8s", text:script.conflict || scenes[1]?.line || "当前脚本未单独标注冲突" },
    { key:"product", label:"PRODUCT REVEAL", type:"产品入场", duration:"8–15s", text:script.productReveal || scenes[2]?.line || scenes[0]?.line || script.product },
    { key:"proof", label:"PROOF / DEMO", type:"动作证明", duration:"15–21s", text:script.proof || scenes.slice(2,-2).map(x=>x.line).filter(Boolean).join(" ") || "当前脚本未单独标注演示" },
    { key:"points", label:"SELLING POINT", type:"价值建立", duration:"21–26s", text:script.sellingPoints || scenes.at(-2)?.line || sellingPoints },
    { key:"cta", label:"CTA", type:"行动引导", duration:"26–30s", text:script.cta || scenes.at(-1)?.line || "当前脚本未单独标注 CTA" },
  ];
}

function withBlocks(script:StudioScript, blocks:EditorBlock[]):StudioScript {
  const byKey=new Map(blocks.map(block=>[block.key,block.text.trim()]));
  return { ...script, hook:byKey.get("hook")||script.hook, conflict:byKey.get("conflict")||script.conflict, productReveal:byKey.get("product")||script.productReveal, proof:byKey.get("proof")||script.proof, sellingPoints:byKey.get("points")||script.sellingPoints, cta:byKey.get("cta")||script.cta, narration:blocks.map(block=>block.text.trim()).filter(Boolean).join(" ") };
}

function scaleTime(value:number, total:number) { return Math.round(value * total / 30); }

function MarkedCopy({text,hits,onSelect}:{text:string;hits:ComplianceHit[];onSelect:(hit:ComplianceHit)=>void}) {
  if (!hits.length) return <>{text}</>;
  const terms = hits.map(hit=>hit.term).sort((a,b)=>b.length-a.length);
  const pattern = new RegExp(`(${terms.map(term=>term.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|")})`,"gi");
  return <>{text.split(pattern).map((part,index)=>{const hit=hits.find(item=>item.term.toLowerCase()===part.toLowerCase());return hit?<button type="button" className={`os-inline-risk os-risk-${hit.level}`} key={`${part}-${index}`} onClick={()=>onSelect(hit)}>{part}</button>:part})}</>;
}

export default function ScriptStudio(props:Props) {
  const [platform,setPlatform] = useState("TikTok");
  const [briefNotes,setBriefNotes] = useState("");
  const [scene,setScene] = useState("");
  const [showMore,setShowMore] = useState(false);
  const [creationMode,setCreationMode] = useState("KOC / UGC");
  const [hookStrategy,setHookStrategy] = useState("好奇");
  const [creativity,set创意强度] = useState("平衡");
  const [outputCount,set生成数量Count] = useState<1|5>(1);
  const [locked,setLocked] = useState<Record<string,boolean>>({});
  const [editing,setEditing] = useState<string|null>(null);
  const [selectedBlockKey,setSelectedBlockKey] = useState<CopilotBlockKey>("hook");
  const [blocks,setBlocks] = useState<EditorBlock[]>(()=>props.result?buildBlocks(props.result,props.form.sellingPoints):[]);
  const [versions,setVersions] = useState<SavedVersion[]>(()=>props.result?[{label:"V1",identity:variantIdentity(props.result),script:props.result,blocks:buildBlocks(props.result,props.form.sellingPoints)}]:[]);
  const [activeVersion,setActiveVersion] = useState(0);
  const [compare,setCompare] = useState<number[]>([]);
  const [compareOpen,setCompareOpen] = useState(false);
  const [selectedRisk,setSelectedRisk] = useState<ComplianceHit|null>(null);
  const [savedNotice,setSavedNotice] = useState(false);
  const [rewriteOpen,setRewriteOpen] = useState<string|null>(null);
  const [rewriteInstruction,setRewriteInstruction] = useState("");
  const [rewriteBusy,setRewriteBusy] = useState(false);
  const [rewriteError,setRewriteError] = useState("");
  const [rewritePreview,setRewritePreview] = useState<RewritePreview|null>(null);
  const [undoRewrite,setUndoRewrite] = useState<UndoRewrite|null>(null);
  const script = props.result;
  const resultIdentity=script?variantIdentity(script):null;
  const syncedResultIdentity=useRef(resultIdentity);

  useEffect(()=>{
    if (!script||resultIdentity===syncedResultIdentity.current) return;
    syncedResultIdentity.current=resultIdentity;
    const nextBlocks=buildBlocks(script,props.form.sellingPoints);
    setBlocks(nextBlocks);
    setVersions(current=>{
      const next=appendScriptVariant(current,script,nextBlocks.map(block=>({...block})));
      setActiveVersion(next.activeIndex);
      if(next.added){setSavedNotice(true);window.setTimeout(()=>setSavedNotice(false),1800);}
      return next.variants;
    });
    setLocked({});
    setEditing(null);
    setRewriteOpen(null); setRewriteInstruction(""); setRewritePreview(null); setUndoRewrite(null); setRewriteError("");
  },[resultIdentity,script,props.form.sellingPoints]);

  useEffect(()=>{
    if (script) setSelectedBlockKey("hook");
  },[resultIdentity,script]);

  const draftScript = useMemo(()=>script ? withBlocks(script,blocks) : null,[script,blocks]);
  const score = draftScript ? props.scoreScript(draftScript) : null;
  const hits = useMemo(()=>draftScript ? checkCompliance(draftScript.narration) : [],[draftScript]);
  const currentStep = props.raceResults.length ? 3 : draftScript ? 2 : 0;
  const totalDuration = Number.parseInt(props.form.duration,10) || 30;
  const pacing = [["Hook",0,3,"#5f5cf6"],["冲突",3,8,"#7772ee"],["产品",8,15,"#4f85dd"],["演示 / 卖点",15,24,"#35a1b7"],["CTA",24,30,"#263f78"]] as const;
  const generationSummary = `${props.form.country} · ${props.form.language} · ${platform} · ${totalDuration}s · ${creationMode} · ${props.form.framework} · ${outputCount} ${outputCount===1?"version":"versions"}`;
  const controls=(count:1|5):GenerationControls=>({platform,additionalRequirements:briefNotes,scenario:scene,creationMode,hookStrategy,creativity,outputCount:count,provider:props.selectedProvider});
  const selectedProviderStatus=props.providerStatuses[props.selectedProvider];const providerReady=selectedProviderStatus?.configured;
  const generationState=props.loading?"generating":props.error?"error":draftScript?"completed":"idle";
  const generationStateLabel={idle:"待生成",generating:"生成中",completed:"已完成",error:"生成失败"}[generationState];
  const versionDirections=["KOC / UGC","Strong Conflict","Product Demo","Curiosity","Storytelling"];
  const versionSlots=Array.from({length:5},(_,index)=>({index,item:props.raceResults[index]??null,direction:versionDirections[index]}));

  function updateBlock(key:string,text:string) {
    const next=blocks.map(block=>block.key===key?{...block,text}:block);
    setBlocks(next); if (script) props.onDraftChange(withBlocks(script,next));
  }
  async function requestRewrite(mode:"single"|"unlocked",targetKey?:string,action?:string,instruction?:string) {
    if(!draftScript||rewriteBusy)return;
    setRewriteBusy(true);setRewriteError("");
    try{
      const productKnowledge=props.products.find(item=>item.name.trim().toLowerCase()===props.form.product.trim().toLowerCase());
      const response=await fetch("/api/copilot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode,targetKey,action,instruction,blocks,lockedKeys:Object.keys(locked).filter(key=>locked[key]),script:draftScript,product:props.form.product,sellingPoints:props.form.sellingPoints,audience:props.form.audience,country:props.form.country,language:props.form.language,offer:props.form.offer,platform,creationMode,hookStrategy,framework:props.form.framework,creativity,productKnowledge,sellingPointKnowledge:props.sellingPointKnowledge})});
      const data=await response.json();if(!response.ok)throw new Error(data.details?.join("；")||data.error||"AI局部精修失败");
      const candidate=(data.candidate.blocks||[]) as CopilotBlock[];const keys=data.candidate.keys as CopilotBlockKey[];
      const next=mergeCopilotBlocks(blocks,candidate,keys) as EditorBlock[];
      setRewritePreview({before:blocks.map(block=>({...block})),after:next,keys,action:instruction?.trim()||action||"重写未锁定部分"});
      setRewriteOpen(null);setRewriteInstruction("");
    }catch(error){setRewriteError(error instanceof Error?error.message:"AI局部精修失败");}
    finally{setRewriteBusy(false);}
  }
  function acceptRewrite(){
    if(!rewritePreview||!script)return;
    setUndoRewrite({blocks:rewritePreview.before.map(block=>({...block})),label:rewritePreview.action});
    setBlocks(rewritePreview.after.map(block=>({...block})));props.onDraftChange(withBlocks(script,rewritePreview.after));setRewritePreview(null);
  }
  function undoLastRewrite(){
    if(!undoRewrite||!script)return;
    const previous=undoRewrite.blocks.map(block=>({...block}));setBlocks(previous);props.onDraftChange(withBlocks(script,previous));setUndoRewrite(null);
  }
  function saveVersion() {
    if (!draftScript) return;
    const saved=props.onSaveVersion(draftScript);
    const nextLabel=`V${versions.length+1}`;
    setVersions(prev=>[...prev,{label:nextLabel,identity:variantIdentity(saved),script:saved,blocks:blocks.map(block=>({...block}))}]);
    setActiveVersion(versions.length); setSavedNotice(true); window.setTimeout(()=>setSavedNotice(false),1800);
  }
  function openVersion(index:number) {
    const version=versions[index]; if(!version)return;
    syncedResultIdentity.current=variantIdentity(version.script);
    setActiveVersion(index); setBlocks(version.blocks.map(block=>({...block}))); props.onDraftChange(version.script);
  }
  function adoptRace(item:StudioScript) {
    props.onAdopt(item); setCompareOpen(false); setCompare([]); setActiveVersion(0);
    document.querySelector(".os-studio-editor-head")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
  function toggleCompare(index:number) { setCompare(current=>current.includes(index)?current.filter(x=>x!==index):current.length<2?[...current,index]:[current[1],index]); }
  const compareItems=compare.map(index=>({index,script:props.raceResults[index]})).filter(item=>item.script);
  const selectedBlock=blocks.find(block=>block.key===selectedBlockKey)||blocks[0];
  const selectedBlockHits=selectedBlock?checkCompliance(selectedBlock.text):[];
  const sendToDirector=()=>{if(!draftScript)return;props.onDraftChange(draftScript);props.onNavigate("director");};

  return <section className="os-script-studio">
    <header className="os-studio-titlebar"><div><span className="os-studio-kicker">AI 脚本创作</span><h1>脚本创作工作台</h1><p>用 Brief 驱动创意赛马，在同一个编辑器完成改稿、合规与下一步制作。</p></div><div className="os-studio-title-actions"><button onClick={()=>props.onNavigate("history")}>历史脚本 <b>{props.historyCount}</b></button><span className={providerReady?"provider-chip online":"provider-chip"}><i/>{providerReady?"Provider 在线":"本地模式"}</span></div></header>

        <section className="os-script-version-rail"><header><div><span>SCRIPT VARIATIONS</span><b>{props.raceResults.length?`${Math.min(props.raceResults.length,5)} 个赛马版本`:"Version Rail · 尚无版本"}</b></div><nav><button disabled={compare.length!==2} onClick={()=>setCompareOpen(true)}>对比 {compare.length}/2</button><button disabled={!props.inputReady||props.loading||props.raceLoading||!providerReady} onClick={()=>{set生成数量Count(5);props.onGenerateRace(controls(5))}}>{props.raceLoading?"生成中…":"＋ 新赛马"}</button></nav></header><div>{versionSlots.map(({item,index,direction})=>{if(item){const itemScore=props.scoreScript(item);const isCurrent=Boolean(script&&variantIdentity(script)===variantIdentity(item));return <article key={`${item.title}-${index}`} className={`${isCurrent?"active":""} ${compare.includes(index)?"comparing":""}`}><button className="os-version-select" onClick={()=>adoptRace(item)}><small>V{index+1}{isCurrent&&<i>当前版本</i>}</small><b>{item.style||item.hookType||direction}</b><span>{item.hook}</span><em><small>SCORE</small>{itemScore.total}</em></button><button className="os-version-compare" aria-label={`选择 V${index+1} 对比`} onClick={()=>toggleCompare(index)}>{compare.includes(index)?"✓":"◇"}</button></article>}return <article className="os-version-empty" key={`empty-v${index+1}`}><div className="os-version-select"><small>V{index+1}</small><b>{direction}</b><span>待生成</span><button className="os-version-slot-generate" disabled={!props.inputReady||props.loading||props.raceLoading||!providerReady} onClick={()=>{set生成数量Count(5);props.onGenerateRace(controls(5))}}>{props.raceLoading?"生成中…":"生成此版本"}</button></div></article>})}</div></section>
    <div className="creative-script-layout">


      <main className="os-studio-center">

        <div className="os-studio-editor-head"><div><span>AI 脚本编辑器</span><h2>{draftScript?.title || "脚本编辑器"}</h2></div><div className="os-version-tabs"><span>方案</span>{versions.map((version,index)=><button className={activeVersion===index?"active":""} key={version.identity} onClick={()=>openVersion(index)}>{version.label}</button>)}<button onClick={()=>props.onNavigate("history")}>全部历史</button></div><div className="os-editor-actions"><span className={`os-generation-state ${generationState}`}>{generationStateLabel}</span><button disabled={!draftScript||rewriteBusy||blocks.every(block=>locked[block.key])} onClick={()=>void requestRewrite("unlocked")}>{rewriteBusy?"AI 精修中…":"优化当前脚本"}</button>{undoRewrite&&<button onClick={undoLastRewrite}>撤回精修</button>}<button disabled={!draftScript} onClick={()=>draftScript&&props.onCopy(draftScript.narration)}>复制全文</button><button disabled={!draftScript} onClick={()=>draftScript&&props.onExport(draftScript)}>导出</button></div></div>
        {props.loading?<WorkspaceState kind="loading" eyebrow="AI 脚本工作台" title="AI 正在构建脚本结构" description="正在根据产品事实、目标用户、Hook 策略和内容框架生成可编辑脚本。" steps={["生成创意方向与内容框架","构建可编辑 Script Blocks","执行事实与合规结果检查"]} detail="服务返回前保持处理中，不提前显示虚假完成状态。" />:props.error&&!draftScript?<WorkspaceState kind="error" icon="!" title="脚本生成暂时中断" description={props.error} primary={{label:"重新生成",onClick:()=>props.onGenerate(controls(1)),disabled:!props.inputReady||!providerReady}} secondary={{label:"修改创作配置",onClick:()=>document.querySelector<HTMLInputElement>(".os-studio-brief input")?.focus()}} />:!draftScript?<WorkspaceState eyebrow="AI 创作工作台" title="开始创建第一条短视频脚本" description="选择产品并设置创作方向，AI 将生成可编辑脚本，并可继续进入导演和配音。" primary={{label:"生成第一条脚本",onClick:()=>props.onGenerate(controls(1)),disabled:!props.inputReady||!providerReady}} secondary={{label:"从产品知识库开始",onClick:()=>props.onNavigate("products")}} detail="也可以从爆款案例库选择参考内容" />:<>
          <section className="os-variant-workflow"><div><span>多方案创作</span><b>当前 {versions[activeVersion]?.label || "V1"}</b><p>{versions.length} 个方案已独立保留，可随时切换继续编辑。</p></div><div><button className="os-variant-primary vf-button vf-button-secondary" disabled={props.loading||!props.inputReady||!providerReady} onClick={()=>props.onGenerate(controls(1))}>＋ 生成新方案</button><button disabled={rewriteBusy} onClick={()=>void requestRewrite("unlocked")}>优化当前脚本</button><button onClick={()=>props.onNavigate("director")}>进入 AI 导演</button><button onClick={()=>props.onNavigate("voice")}>AI 语音</button></div></section>
          <section className="os-script-context-strip" aria-label="当前脚本信息"><span>{draftScript.language}</span><span>{draftScript.country}</span><span>{platform}</span><span>{totalDuration}s</span><span>{draftScript.style}</span><span className={hits.length?"risk":"safe"}>{hits.length?`${hits.length} 项合规风险`:"合规通过"}</span><strong>综合 {score?.total}</strong></section>
          <ScriptDocument script={draftScript}/><details className="creative-block-editor"><summary>编辑口播段落 · 锁定与定向精修</summary><div className="os-script-blocks">{blocks.map((block,index)=>{const blockHits=checkCompliance(block.text);const actions=block.key==="hook"?["更吸睛","更自然","更 KOC / UGC","更简短","更口语","加强冲突"]:block.key==="proof"?["加强 Proof / 证明","更自然","更简短","更口语"]:block.key==="cta"?["更强转化","更自然","更 KOC / UGC","更简短"]:["更自然","更 KOC / UGC","加强冲突","更简短","更口语"];return <article key={block.key} onClick={()=>setSelectedBlockKey(block.key)} className={`${locked[block.key]?"locked":""} ${editing===block.key?"editing":""} ${selectedBlockKey===block.key?"selected":""}`}><aside><b>{String(index+1).padStart(2,"0")}</b><i/></aside><div className="os-block-main"><header><div><span>{block.label}</span><em>{block.type}</em><small>{block.duration}</small></div><div><button onClick={()=>setEditing(editing===block.key?null:block.key)}>{editing===block.key?"完成":"编辑"}</button><button onClick={()=>props.onCopy(block.text)}>复制</button><button className={locked[block.key]?"active":""} onClick={()=>setLocked(value=>({...value,[block.key]:!value[block.key]}))}>{locked[block.key]?"🔒 已锁定":"锁定"}</button><button disabled={Boolean(locked[block.key])||rewriteBusy} onClick={()=>setRewriteOpen(rewriteOpen===block.key?null:block.key)}>✦ AI 精修</button></div></header>{editing===block.key&&!locked[block.key]?<textarea aria-label={`编辑 ${block.label}`} value={block.text} onChange={e=>updateBlock(block.key,e.target.value)}/>:<p><MarkedCopy text={block.text} hits={blockHits} onSelect={setSelectedRisk}/></p>}<details><summary>更多精修方式</summary><footer><span>镜头意图 · {block.type}</span>{actions.map(action=><button key={action} disabled={Boolean(locked[block.key])||rewriteBusy} onClick={()=>void requestRewrite("single",block.key,action)}>{action}</button>)}</footer></details>{rewriteOpen===block.key&&!locked[block.key]&&<div className="os-copilot-custom"><label>自定义 AI 指令<textarea rows={2} value={rewriteInstruction} onChange={event=>setRewriteInstruction(event.target.value)} placeholder="例如：改成西班牙普通女生聊天的感觉，但保留悬念。"/></label><div><button onClick={()=>{setRewriteOpen(null);setRewriteInstruction("")}}>取消</button><button disabled={!rewriteInstruction.trim()||rewriteBusy} onClick={()=>void requestRewrite("single",block.key,undefined,rewriteInstruction)}>{rewriteBusy?"生成中…":"生成候选"}</button></div></div>}{blockHits.length>0&&<div className="os-block-risk-row">{blockHits.map((hit,hitIndex)=><button key={`${hit.term}-${hitIndex}`} onClick={()=>setSelectedRisk(hit)}><i className={`os-level-${hit.level}`}/>{hit.level}风险 · {hit.term}</button>)}</div>}</div></article>})}</div>
          </details>{rewriteError&&<p className="os-copilot-error">Copilot：{rewriteError}<button onClick={()=>setRewriteError("")}>×</button></p>}
          <section className="os-insight-grid"><article className="os-score-panel"><header><div><span>真实评分</span><h3>脚本评分</h3></div><strong>{score?.total}<small>/100</small></strong></header><div className="os-score-metrics"><div><span>Hook</span><i><b style={{width:`${(score?.hook||0)/25*100}%`}}/></i><em>{score?.hook}/25</em></div><div><span>结构 / 节奏</span><i><b style={{width:`${(score?.structure||0)/25*100}%`}}/></i><em>{score?.structure}/25</em></div><div><span>证明力</span><i><b style={{width:`${(score?.proof||0)/22*100}%`}}/></i><em>{score?.proof}/22</em></div><div><span>转化引导</span><i><b style={{width:`${(score?.conversion||0)/20*100}%`}}/></i><em>{score?.conversion}/20</em></div></div><div className="os-score-diagnosis"><p><b>优势</b>{(score?.hook||0)>=22?"Hook 进入快，开场信息明确":"现有结构完整，可继续强化开场"}</p><p><b>建议</b>{(score?.conversion||0)>=18?"转化路径明确，注意保持自然表达":"补充真实购买理由，让 CTA 更自然"}</p></div><div className="os-pending-metrics">留存 · 自然度 · 卖点清晰度 <em>待接入</em></div></article><article className="os-compliance-panel"><header><div><span>合规检查</span><h3>合规检测</h3></div><b className={hits.length?"warning":"clear"}>{hits.length?`${hits.length} 项风险`:"通过"}</b></header>{hits.length===0?<div className="os-compliance-clear"><i>✓</i><div><b>未命中已知风险词</b><p>仍需人工检查画面、测试条件和促销真实性。</p></div></div>:<div className="os-compliance-list">{hits.slice(0,4).map((hit,index)=><button key={`${hit.term}-${index}`} onClick={()=>setSelectedRisk(hit)}><i className={`os-level-${hit.level}`}/><div><b>{hit.level}风险 · {hit.term}</b><span>{hit.category} · {hit.riskType}</span></div><em>查看 →</em></button>)}</div>}</article></section>
        </>}

        <details className="creative-race-details"><summary>赛马详情与版本比较</summary><section className="os-race-arena"><header><div><span>创意赛马</span><h2>5 条创意赛马</h2><p>先生成不同 Creative Concept，再分别完成脚本并执行重复度检查。</p></div><div><span className="os-race-count">已选 {compare.length}/2</span><button disabled={compare.length!==2} onClick={()=>setCompareOpen(true)}>对比所选</button><button className="os-race-generate vf-button vf-button-secondary" disabled={!props.inputReady||props.loading||props.raceLoading||!providerReady} onClick={()=>{set生成数量Count(5);props.onGenerateRace(controls(5))}}>{props.raceLoading?"正在生成 5 条…":"✦ 生成 5 条赛马稿"}</button></div></header>{props.raceResults.length===0?<div className="os-race-empty"><div>{letters.map(letter=><span key={letter}>{letter}</span>)}</div><b>候选创意会在这里集中呈现</b><p>每张卡只突出 Hook、方向、框架、真实评分和合规状态。</p></div>:<div className="os-race-cards">{props.raceResults.map((item,index)=>{const itemScore=props.scoreScript(item);const risks=checkCompliance(item.narration);return <article className={`${script===item?"adopted":""} ${compare.includes(index)?"comparing":""}`} key={`${item.title}-${index}`} onClick={()=>adoptRace(item)}><header><b>{letters[index]}</b><div><span>{itemScore.total}</span><small>综合</small></div></header><span className="os-direction">{item.creativeAngle || item.title}</span><h3>{item.hook}</h3><dl><div><dt>Hook 类型</dt><dd>{item.hookType || hookStrategy}</dd></div><div><dt>框架</dt><dd>{item.framework || props.form.framework}</dd></div><div><dt>场景</dt><dd>{item.scenario || item.style}</dd></div></dl><div className="os-race-status"><span className={risks.length?"risk":"safe"}>{risks.length?`${risks.length} 项风险`:"合规通过"}</span>{script===item&&<span className="os-adopted-state">当前采用</span>}</div><footer><button className="os-primary" onClick={e=>{e.stopPropagation();adoptRace(item)}}>{script===item?"已采用":"采用"}</button><button className={compare.includes(index)?"selected":""} onClick={e=>{e.stopPropagation();toggleCompare(index)}}>{compare.includes(index)?"已选对比":"对比"}</button></footer></article>})}</div>}</section>
        </details><footer className="os-pipeline-bar"><div className="os-pipeline-context"><span>当前方案</span><b>{versions[activeVersion]?.label||"V1"}</b><small>{draftScript?.title||"尚未生成"}</small>{savedNotice&&<em>✓ 新方案已独立保存</em>}</div><div><button disabled={!draftScript} onClick={()=>{saveVersion();notifyWorkspace("当前版本已保存")}}>保存当前版本</button><button disabled={props.loading||!props.inputReady||!providerReady} onClick={()=>props.onGenerate(controls(1))}>生成新方案</button><button disabled={!draftScript} onClick={()=>document.querySelector(".os-compliance-panel")?.scrollIntoView({behavior:"smooth"})}>合规检测</button><button disabled={!draftScript} onClick={()=>props.onNavigate("voice")}>AI 语音</button><button className="os-pipeline-primary vf-button vf-button-primary" disabled={!draftScript} onClick={()=>props.onNavigate("director")}>进入 AI 导演 →</button></div></footer>
      </main>

      <Inspector title="创意检查器"><InspectorSection title="创作需求">      <aside className="os-studio-column os-studio-brief">
        <div className="os-studio-card-head"><div><span>创作需求</span><h2>创作需求</h2></div><small>真实输入</small></div>
        <section className="os-brief-group"><header><b>产品</b><span>01</span></header><label>产品知识库<select value="" onChange={e=>{const item=props.products.find(x=>String(x.id)===e.target.value);if(item)props.onUseProduct(item)}}><option value="">选择产品自动填充…</option>{props.products.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>产品名称<input value={props.form.product} onChange={e=>props.onUpdate("product",e.target.value)}/></label><label>核心卖点<textarea rows={3} value={props.form.sellingPoints} onChange={e=>props.onUpdate("sellingPoints",e.target.value)}/></label></section>
        <section className="os-brief-group"><header><b>受众</b><span>02</span></header><label>目标市场<input value={props.form.country} onChange={e=>props.onUpdate("country",e.target.value)}/></label><label>目标用户<input value={props.form.audience} onChange={e=>props.onUpdate("audience",e.target.value)}/></label>{showMore&&<label>使用场景 <em className="os-connected-badge">已接入</em><input value={scene} onChange={e=>setScene(e.target.value)} placeholder="例如：通勤、旅行、开箱"/></label>}</section>
        <section className="os-brief-group"><header><b>内容</b><span>03</span></header><label>发布平台<div className="os-studio-segments">{["TikTok","Reels","Shorts"].map(x=><button type="button" className={platform===x?"selected":""} onClick={()=>setPlatform(x)} key={x}>{x}</button>)}</div><small>平台节奏规则已进入生成 Prompt</small></label><div className="os-studio-pair"><label>语言<select value={props.form.language} onChange={e=>props.onUpdate("language",e.target.value)}>{props.languages.map(x=><option key={x}>{x}</option>)}</select></label><label>时长<select value={props.form.duration} onChange={e=>props.onUpdate("duration",e.target.value)}><option value="30">30秒</option><option value="45">45秒</option><option value="60">60秒</option></select></label></div>{showMore&&<label>促销信息<input value={props.form.offer} onChange={e=>props.onUpdate("offer",e.target.value)}/></label>}</section>
        <section className="os-brief-group"><header><b>参考</b><span>04</span></header>{props.mode==="replicate"&&<label>爆款参考文案<textarea rows={4} value={props.referenceScript} onChange={e=>props.onReferenceChange(e.target.value)} placeholder="粘贴完整爆款口播，至少 30 字"/><small>{props.referenceScript.length} 字</small></label>}<button className="os-reference-button" onClick={()=>props.onNavigate("library")}>选择爆款案例 <em>从案例库</em></button>{showMore&&<label>补充要求 <em className="os-connected-badge">已接入</em><textarea rows={3} value={briefNotes} onChange={e=>setBriefNotes(e.target.value)} placeholder="例如：避免强销售语气，增加通勤场景"/></label>}</section>
        <button className="os-more-settings" onClick={()=>setShowMore(value=>!value)}>{showMore?"收起更多设置":"更多设置"}<span>{showMore?"⌃":"⌄"}</span></button>
      </aside>      <aside className="os-studio-column os-studio-settings"><div className="os-studio-card-head"><div><span>AI 设置</span><h2>AI 创作设置</h2></div><small className={providerReady?"provider-on":"provider-off"}>{providerReady?"在线":"本地"}</small></div><section className="os-setting-group os-model-selector"><header><b>AI 模型</b><span>{selectedProviderStatus?.configured?"已连接":"未配置"}</span></header><select aria-label="AI 模型" value={props.selectedProvider} onChange={e=>props.onProviderChange(e.target.value as ProviderId)}>{(["deepseek","doubao","openai"] as ProviderId[]).map(id=>{const item=props.providerStatuses[id];return <option value={id} key={id}>{item.label} · {item.configured?"已连接":"未配置"}</option>})}</select>{!providerReady&&<p className="os-provider-warning">缺少：{selectedProviderStatus?.missingFields.join("、")}</p>}</section><section className="os-setting-group"><header><b>创作模式</b><span>已接入</span></header><div className="os-choice-grid">{creationModes.map(mode=><button className={creationMode===mode?"selected":""} onClick={()=>setCreationMode(mode)} key={mode}>{mode}</button>)}</div></section><section className="os-setting-group"><header><b>开场策略</b><span>已接入</span></header><div className="os-choice-grid os-three">{hookStrategies.map(strategy=><button className={hookStrategy===strategy?"selected":""} onClick={()=>setHookStrategy(strategy)} key={strategy}>{strategy}</button>)}</div></section><section className="os-setting-group"><header><b>内容框架</b><span>已接入</span></header><select value={props.form.framework} onChange={e=>props.onUpdate("framework",e.target.value)}><option>智能随机</option>{compact内容框架s.map(name=><option key={name}>{name}</option>)}{props.frameworks.filter(item=>!compact内容框架s.includes(item.name)).map(item=><option key={item.name}>{item.name}</option>)}</select></section><section className="os-setting-group"><header><b>创意强度</b><span>已接入</span></header><div className="os-studio-segments">{["稳定","平衡","激进"].map(value=><button className={creativity===value?"selected":""} onClick={()=>set创意强度(value)} key={value}>{value}</button>)}</div></section><section className="os-setting-group"><header><b>生成数量</b><span>已接入</span></header><div className="os-studio-pair"><label>时长<select value={props.form.duration} onChange={e=>props.onUpdate("duration",e.target.value)}><option value="30">30s</option><option value="45">45s</option><option value="60">60s</option></select></label><label>语言<select value={props.form.language} onChange={e=>props.onUpdate("language",e.target.value)}>{props.languages.map(x=><option key={x}>{x}</option>)}</select></label></div><label>生成数量<div className="os-studio-segments"><button className={outputCount===1?"selected":""} onClick={()=>set生成数量Count(1)}>1 条</button><button className={outputCount===5?"selected":""} onClick={()=>set生成数量Count(5)}>5 条赛马</button></div></label></section><div className="os-provider-card"><span>AI 服务状态</span><strong>{props.lastProviderRun ? props.lastProviderRun.providerRequested+" → "+props.lastProviderRun.providerUsed : (selectedProviderStatus?.label||"Provider")+" "+(providerReady?"已连接":"未配置")}</strong><p>{props.lastProviderRun ? "AI="+(props.lastProviderRun.aiGenerated?"是":"否")+" · Fallback="+(props.lastProviderRun.fallbackUsed?"是":"否")+" · "+(props.lastProviderRun.providerErrorType||"无错误")+" · "+(props.lastProviderRun.responseTimeMs??"—")+"ms" : "切换只影响下一次生成，不会重置 Brief 或创作控制项。"}</p></div><div className="os-generation-summary"><span>生成摘要</span><p>{generationSummary}</p></div>{props.error&&<p className="os-studio-error">{props.error}</p>}<button className="os-studio-generate vf-button vf-button-primary" aria-busy={props.loading} title={!providerReady?"当前 Provider 未配置":!props.inputReady?"请先完成必填创作信息":undefined} disabled={!props.inputReady||props.loading||props.raceLoading||!providerReady} onClick={()=>{set生成数量Count(1);props.onGenerate(controls(1))}}>{props.loading?"正在生成…":"✦ 生成单条脚本"}</button><button className="os-studio-race vf-button vf-button-secondary" disabled={!props.inputReady||props.loading||props.raceLoading||!providerReady} onClick={()=>{set生成数量Count(5);props.onGenerateRace(controls(5))}}>{props.raceLoading?"赛马生成中…":"生成 5 条赛马稿"}</button></aside></InspectorSection><InspectorSection title="创意策略" open><dl><dt>创意角度</dt><dd>{draftScript?.creativeAngle || "待生成"}</dd><dt>Hook 机制</dt><dd>{draftScript?.hookType || hookStrategy}</dd><dt>Proof 机制</dt><dd>{draftScript?.proofMechanism || "待生成"}</dd><dt>创作形式</dt><dd>{creationMode}</dd></dl></InspectorSection><InspectorSection title="AI 精修与评分"><aside className="os-script-assistant"><header><span>AI SCRIPT ASSISTANT</span><h2>AI 脚本助手</h2><small>{selectedBlock?`当前 · ${selectedBlock.label}`:"等待脚本"}</small></header>{selectedBlock&&draftScript?<><section className="os-assistant-block-summary"><div><b>{selectedBlock.label}</b><span>{selectedBlock.duration}</span><em>{locked[selectedBlock.key]?"已锁定":"可编辑"}</em></div><p>{selectedBlock.text}</p></section><section className="os-assistant-script-score"><header><b>真实评分与规则</b><strong>{score?.total}<small>/100</small></strong></header><div><span>Hook Strength <b>{score?.hook}/25</b></span><span>Strategy Match <b>{score?.structure}/25</b></span><span>Product Proof <b>{score?.proof}/22</b></span><span>Conversion <b>{score?.conversion}/20</b></span><span>Compliance <b className={selectedBlockHits.length?"risk":"safe"}>{selectedBlockHits.length?`${selectedBlockHits.length} 项风险`:"通过"}</b></span></div></section><section className="os-assistant-script-actions"><b>Copilot Suggestions</b><p>{selectedBlock.key==="hook"?"保留信息缺口，让开场动作与第一句话同时建立观看理由。":selectedBlock.key==="proof"?"让画面完整呈现操作前、关键动作和结果，避免只靠口播证明。":"保持当前 Block 的单一职责，并与前后内容形成清晰推进。"}</p><button className="os-primary" disabled={Boolean(locked[selectedBlock.key])||rewriteBusy} onClick={()=>void requestRewrite("single",selectedBlock.key,"优化当前 Block")}>✦ 优化当前 Block</button><div><button disabled={Boolean(locked[selectedBlock.key])||rewriteBusy} onClick={()=>void requestRewrite("single",selectedBlock.key,"生成替代表达")}>替代表达</button><button disabled={Boolean(locked[selectedBlock.key])||rewriteBusy} onClick={()=>void requestRewrite("single",selectedBlock.key,"更激进")}>更激进</button><button disabled={Boolean(locked[selectedBlock.key])||rewriteBusy} onClick={()=>void requestRewrite("single",selectedBlock.key,"更原生")}>更原生</button><button disabled={Boolean(locked[selectedBlock.key])||rewriteBusy} onClick={()=>void requestRewrite("single",selectedBlock.key,"更简洁")}>更简洁</button></div><button disabled={rewriteBusy||blocks.every(block=>locked[block.key])} onClick={()=>void requestRewrite("unlocked")}>重写未锁定 Block</button>{undoRewrite&&<button onClick={undoLastRewrite}>撤回上次修改</button>}</section></>:<WorkspaceState eyebrow="AI 脚本助手" title="还没有脚本" description="创建脚本后，这里会显示当前 Block、真实评分、合规风险与 Copilot 建议。"/>}<details className="os-script-creative-controls"><summary>Creative Controls <span>创作参数</span></summary><section><label>创作模式<select value={creationMode} onChange={event=>setCreationMode(event.target.value)}>{creationModes.map(value=><option key={value}>{value}</option>)}</select></label><label>Hook Strategy<select value={hookStrategy} onChange={event=>setHookStrategy(event.target.value)}>{hookStrategies.map(value=><option key={value}>{value}</option>)}</select></label><label>Framework<select value={props.form.framework} onChange={event=>props.onUpdate("framework",event.target.value)}><option>智能随机</option>{compact内容框架s.map(value=><option key={value}>{value}</option>)}</select></label><label>Creativity<select value={creativity} onChange={event=>set创意强度(event.target.value)}>{["稳定","平衡","激进"].map(value=><option key={value}>{value}</option>)}</select></label><label>Platform<select value={platform} onChange={event=>setPlatform(event.target.value)}>{["TikTok","Reels","Shorts"].map(value=><option key={value}>{value}</option>)}</select></label><label>Output Count<select value={outputCount} onChange={event=>set生成数量Count(Number(event.target.value) as 1|5)}><option value="1">1 条</option><option value="5">5 条赛马</option></select></label></section><details><summary>Project Brief</summary><label>产品<input value={props.form.product} onChange={event=>props.onUpdate("product",event.target.value)}/></label><label>核心卖点<textarea value={props.form.sellingPoints} onChange={event=>props.onUpdate("sellingPoints",event.target.value)}/></label><label>目标用户<input value={props.form.audience} onChange={event=>props.onUpdate("audience",event.target.value)}/></label></details><button disabled={!props.inputReady||props.loading||!providerReady} onClick={()=>props.onGenerate(controls(outputCount))}>{props.loading?"正在生成…":outputCount===5?"生成 5 条赛马":"生成脚本"}</button></details><footer><button disabled={!draftScript} onClick={()=>{saveVersion();notifyWorkspace("当前版本已保存")}}>保存版本</button><button className="os-send-director vf-button vf-button-primary" disabled={!draftScript} onClick={sendToDirector}>发送到 AI Director →</button></footer></aside></InspectorSection></Inspector>


    </div>

    {selectedRisk&&<div className="os-risk-popover" role="dialog" aria-modal="true" aria-label="合规风险详情"><button className="os-risk-backdrop" aria-label="关闭" onClick={()=>setSelectedRisk(null)}/><article><header><div><span className={`os-risk-label os-risk-${selectedRisk.level}`}>{selectedRisk.level}风险</span><small>{selectedRisk.riskType}</small></div><button onClick={()=>setSelectedRisk(null)}>×</button></header><h3>{selectedRisk.term}</h3><dl><div><dt>原表达</dt><dd>{selectedRisk.term}</dd></div><div><dt>风险原因</dt><dd>{selectedRisk.suggestion}</dd></div><div><dt>推荐安全表达</dt><dd>{selectedRisk.replacement}</dd></div></dl><button onClick={()=>{props.onCopy(selectedRisk.replacement);setSelectedRisk(null)}}>复制安全表达</button></article></div>}
    {rewritePreview&&<div className="os-copilot-preview" role="dialog" aria-modal="true" aria-label="AI精修前后对比"><button className="os-copilot-preview-backdrop" aria-label="放弃候选" onClick={()=>setRewritePreview(null)}/><article><header><div><span>脚本 AI 精修</span><h2>接受前检查修改</h2><p>{rewritePreview.action} · 仅修改 {rewritePreview.keys.length} 个未锁定 Block</p></div><button onClick={()=>setRewritePreview(null)}>×</button></header><div className="os-copilot-diff">{rewritePreview.keys.map(key=>{const before=rewritePreview.before.find(block=>block.key===key)!;const after=rewritePreview.after.find(block=>block.key===key)!;return <section key={key}><h3>{before.label}</h3><div><article><span>修改前</span><p>{before.text}</p></article><article className="os-after"><span>修改后</span><p>{after.text}</p></article></div></section>})}</div><footer><button onClick={()=>setRewritePreview(null)}>放弃，不修改</button><button className="os-accept" onClick={acceptRewrite}>接受并替换</button></footer></article></div>}
    {compareOpen&&compareItems.length===2&&<div className="os-compare-modal" role="dialog" aria-modal="true" aria-label="赛马版本对比"><button className="os-compare-backdrop" aria-label="关闭" onClick={()=>setCompareOpen(false)}/><article><header><div><span>对比模式</span><h2>{letters[compareItems[0].index]} vs {letters[compareItems[1].index]}</h2><p>并排比较真实脚本内容与现有评分。</p></div><button onClick={()=>setCompareOpen(false)}>×</button></header><div className="os-compare-columns">{compareItems.map(({index,script:item})=>{const itemScore=props.scoreScript(item);const itemHits=checkCompliance(item.narration);const itemBlocks=buildBlocks(item,props.form.sellingPoints);return <section key={index}><div className="os-compare-version"><b>{letters[index]}</b><div><h3>{item.title}</h3><span>{item.style} · {props.form.framework}</span></div><strong>{itemScore.total}</strong></div>{[["Hook",item.hook],["创意角度",item.title],["内容结构",itemBlocks.map(block=>block.label).join(" → ")],["视频节奏",pacing.map(([label,start,end])=>`${scaleTime(start,totalDuration)}–${scaleTime(end,totalDuration)}s ${label}`).join(" · ")],["核心卖点",itemBlocks.find(block=>block.key==="points")?.text||props.form.sellingPoints],["CTA",itemBlocks.find(block=>block.key==="cta")?.text||""]].map(([label,value])=><div className="os-compare-row" key={label}><span>{label}</span><p>{value}</p></div>)}<div className="os-compare-scores"><div><span>Hook</span><b>{itemScore.hook}/25</b></div><div><span>结构 / 节奏</span><b>{itemScore.structure}/25</b></div><div><span>证明力</span><b>{itemScore.proof}/22</b></div><div><span>转化</span><b>{itemScore.conversion}/20</b></div><div><span>自然度 / 留存</span><em>待接入</em></div><div><span>合规风险</span><b>{itemHits.length} 项</b></div></div><button className="os-adopt-compare" onClick={()=>{adoptRace(item);setCompareOpen(false)}}>采用 {letters[index]}</button></section>})}</div></article></div>}
  </section>;
}
