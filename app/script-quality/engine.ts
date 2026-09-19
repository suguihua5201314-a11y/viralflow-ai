import { randomUUID } from "node:crypto";
import { callProvider, getProviderStatuses, type ProviderRequest, type ProviderResponse } from "../provider-router";
import type { ProviderId, ProviderStatus } from "../provider-types";
import { normalizeStructuredScript, textSimilarity, type CreativeConcept, type StructuredScript } from "../script-generation";
import { getScriptQualityFewShots } from "./few-shots";
import { creativeMessages, criticMessages, rewriteMessages, writerMessages } from "./prompts";
import type { CriticIssue, CriticResult, QualityCreativeConcept, ScriptQualityInput, ScriptQualityMetadata, ScriptQualityResult, WriterDraft } from "./types";

export const QUALITY_STAGE_TIMEOUTS={creative:30_000,writer:45_000,critic:30_000,rewrite:35_000} as const;
type ProviderCaller=(request:ProviderRequest)=>Promise<ProviderResponse>;
type StatusReader=()=>Record<ProviderId,ProviderStatus>;
type Dependencies={call?:ProviderCaller;statuses?:StatusReader;requestId?:()=>string;validateFinal?:(script:StructuredScript)=>void};

export function resolveScriptEngineMode(value=process.env.SCRIPT_ENGINE_MODE){return value?.trim().toLowerCase()==="quality"?"quality" as const:"legacy" as const;}

function parseObject<T>(content:string):T{
  const cleaned=content.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"");
  return JSON.parse(cleaned) as T;
}
const nonEmpty=(value:unknown)=>typeof value==="string"&&Boolean(value.trim());
const normalizedText=(value:string)=>value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu,"");
function validConcept(value:QualityCreativeConcept){return value&&["id","creativeAngle","hookMechanism","hookLine","openingVisual","corePainPoint","primarySellingPoint","proofMechanism","creatorPersona","contentFormat","ctaDirection"].every(key=>nonEmpty(value[key as keyof QualityCreativeConcept]))&&Array.isArray(value.riskNotes);}
function validDraft(value:WriterDraft){return value&&nonEmpty(value.creativeDirection)&&nonEmpty(value.hook?.line)&&nonEmpty(value.hook?.visual)&&nonEmpty(value.spokenScript)&&Array.isArray(value.shots)&&value.shots.length>=4&&value.shots.every(shot=>[shot.time,shot.visual,shot.line,shot.edit].every(nonEmpty))&&normalizedText(value.hook.line)===normalizedText(value.shots[0].line)&&normalizedText(value.spokenScript)===normalizedText(value.shots.map(shot=>shot.line).join(" "))&&nonEmpty(value.proof?.claim)&&nonEmpty(value.proof?.visualEvidence)&&nonEmpty(value.cta);}
function validCritic(value:CriticResult){return value&&typeof value.pass==="boolean"&&Array.isArray(value.issues)&&Array.isArray(value.preserve)&&value.issues.every(issue=>["hook","tone","shootability","proof","fact","compliance","diversity"].includes(issue.type)&&["low","medium","high"].includes(issue.severity)&&[issue.location,issue.problem,issue.rewriteInstruction].every(nonEmpty));}

const forbiddenClaims:Array<[RegExp,string]>=[
  [/100\s*%/i,"100% absolute claim"],[/completely invisible|完全看不到|完全不可见|completamente invisible/i,"absolute privacy claim"],
  [/zero bubbles|零气泡|完全没有气泡|cero burbujas/i,"absolute bubble claim"],[/never breaks|永不碎|摔不坏|nunca se rompe/i,"absolute durability claim"],
  [/\b(?:best|perfect|unbeatable)\b|最强|完美|无敌|el mejor|la mejor|perfect[oa]|invencible/i,"unsupported superlative"],
];
export function deterministicQualityIssues(draft:WriterDraft):CriticIssue[]{
  const surface=JSON.stringify(draft);const issues:CriticIssue[]=[];
  for(const [pattern,label] of forbiddenClaims)if(pattern.test(surface))issues.push({type:"compliance",severity:"high",location:"script",problem:label,rewriteInstruction:"改为可观察、有限定条件且不绝对的事实表达，并保留原创意方向。"});
  const opening=[draft.hook.visual,draft.shots[0]?.visual,draft.shots[0]?.line].filter(Boolean).join(" ");
  if(!/按|拉|滑|放|撕|擦|倒|转|展示|拿|镜头|对比|press|pull|slide|place|peel|wipe|pour|turn|show|hold|compare|presiona|tira|desliza|coloca|retira|limpia|vierte|gira|muestra|sostiene|compara/i.test(opening))issues.push({type:"hook",severity:"medium",location:"hook/opening shot",problem:"前三秒缺少明确可拍动作或视觉变化",rewriteInstruction:"只强化首帧动作与对应Hook，不改变后续Proof和CTA。"});
  return issues;
}

function dimensionSimilarity(a:string,b:string){return Math.max(textSimilarity(a,b),a.trim().toLowerCase()===b.trim().toLowerCase()?1:0);}
export function assessConceptDiversity(concepts:QualityCreativeConcept[]){
  const pairs:Array<{left:number;right:number;similarDimensions:string[]}>=[];
  const dimensions:Array<[keyof QualityCreativeConcept,string]>=[["hookMechanism","hookMechanism"],["openingVisual","openingVisual"],["primarySellingPoint","primarySellingPoint"],["proofMechanism","proofMechanism"],["creatorPersona","creatorPersona"],["contentFormat","contentFormat"]];
  for(let left=0;left<concepts.length;left++)for(let right=left+1;right<concepts.length;right++){
    const similar=dimensions.filter(([key])=>dimensionSimilarity(String(concepts[left][key]),String(concepts[right][key]))>=.68).map(([,label])=>label);
    if(similar.length>=4)pairs.push({left,right,similarDimensions:similar});
  }
  return{passed:concepts.length===5&&pairs.length===0,pairs};
}

export function preservesRequiredContent(before:WriterDraft,after:WriterDraft,preserve:string[]){
  const original=JSON.stringify(before),rewritten=JSON.stringify(after);
  return preserve.filter(nonEmpty).every(value=>original.includes(value)&&rewritten.includes(value));
}

function toPublicScript(input:ScriptQualityInput,concept:QualityCreativeConcept,draft:WriterDraft,latencyMs:number):StructuredScript{
  const mappedConcept:CreativeConcept={id:concept.id,creativeAngle:concept.creativeAngle,hookMechanism:concept.hookMechanism,scenario:concept.openingVisual,conflict:concept.corePainPoint,proofMechanism:concept.proofMechanism,sellingPointPriority:concept.primarySellingPoint,ctaStyle:concept.ctaDirection};
  const scenes=draft.shots.map(shot=>({...shot}));
  const base:StructuredScript={title:draft.creativeDirection,product:input.product,language:input.language,country:input.country,style:input.style,creativeAngle:draft.creativeDirection,hookType:concept.hookMechanism,framework:input.framework||"智能随机",hook:scenes[0]?.line||draft.hook.line,alternateHooks:[],narration:scenes.map(shot=>shot.line).join("\n"),conflict:scenes[1]?.line||draft.hook.line,productReveal:scenes[2]?.line||draft.proof.claim,proof:`${draft.proof.claim}：${draft.proof.visualEvidence}`,sellingPoints:draft.proof.claim,cta:draft.cta,shootingSuggestion:scenes.map(shot=>shot.visual).join("；"),scenario:draft.hook.visual,proofMechanism:draft.proof.visualEvidence,ctaStyle:draft.cta,concept:mappedConcept,scenes,providerRequested:"openai",providerUsed:"openai",fallbackUsed:false,providerErrorType:null,responseTimeMs:latencyMs,aiGenerated:true,languageRepairAttempted:false};
  return normalizeStructuredScript(base,{...input,offer:input.offer},mappedConcept);
}

function baseMetadata(input:ScriptQualityInput,id:string):ScriptQualityMetadata{return{requestId:id,projectId:input.projectId||null,engineMode:"quality",creative:null,writer:[],critic:[],rewrite:[],rewriteTriggered:false,fallbackUsed:false,fallbackReason:null};}
function safeReason(error:unknown){if(error instanceof SyntaxError)return"invalid_json";const value=error instanceof Error?error.message:"quality_stage_failed";return /^[a-z0-9_-]{1,80}$/i.test(value)?value:"quality_stage_failed";}
function stageTotal(items:Array<{latencyMs:number}>){return items.reduce((total,item)=>total+item.latencyMs,0);}
function logMetadata(event:"SCRIPT_QUALITY_ENGINE"|"QUALITY_ENGINE_FALLBACK",metadata:ScriptQualityMetadata){
  console[event==="QUALITY_ENGINE_FALLBACK"?"warn":"info"](event,JSON.stringify({requestId:metadata.requestId,projectId:metadata.projectId,engineMode:metadata.engineMode,creativeProvider:metadata.creative?.provider||null,creativeModel:metadata.creative?.model||null,creativeLatency:metadata.creative?.latencyMs||null,writerProvider:metadata.writer[0]?.provider||null,writerModel:metadata.writer[0]?.model||null,writerLatency:stageTotal(metadata.writer),criticProvider:metadata.critic[0]?.provider||null,criticModel:metadata.critic[0]?.model||null,criticLatency:stageTotal(metadata.critic),rewriteTriggered:metadata.rewriteTriggered,rewriteLatency:stageTotal(metadata.rewrite),fallbackUsed:metadata.fallbackUsed,fallbackReason:metadata.fallbackReason}));
}

export async function runScriptQualityEngine(input:ScriptQualityInput,deps:Dependencies={}):Promise<ScriptQualityResult>{
  const caller=deps.call||callProvider,statuses=(deps.statuses||getProviderStatuses)();const requestId=input.requestId||(deps.requestId||randomUUID)();const metadata=baseMetadata(input,requestId);
  const fallback=(reason:string):ScriptQualityResult=>{metadata.fallbackUsed=true;metadata.fallbackReason=reason;logMetadata("QUALITY_ENGINE_FALLBACK",metadata);return{status:"fallback",reason,metadata};};
  if(!statuses.openai.configured)return fallback("openai_unavailable");
  const creativeProvider:ProviderId=statuses.deepseek.configured?"deepseek":"openai";
  try{
    const creative=await caller({provider:creativeProvider,messages:creativeMessages(input),temperature:.9,topP:.9,maxTokens:3200,timeoutMs:QUALITY_STAGE_TIMEOUTS.creative});
    metadata.creative={provider:creativeProvider,model:statuses[creativeProvider].model,latencyMs:creative.responseTimeMs};
    const parsed=parseObject<{concepts:QualityCreativeConcept[]}>(creative.content);const concepts=parsed.concepts;
    if(!Array.isArray(concepts)||concepts.length!==5||!concepts.every(validConcept))throw new Error("creative_schema_invalid");
    if(!assessConceptDiversity(concepts).passed)throw new Error("creative_similarity_high");
    const selected=Number(input.outputCount)===5?concepts:[concepts[0]];
    const scripts=await Promise.all(selected.map(async concept=>{
      const fewShots=getScriptQualityFewShots({market:input.country,language:input.language});
      const writer=await caller({provider:"openai",messages:writerMessages(input,concept,fewShots),temperature:.8,topP:.9,maxTokens:4200,timeoutMs:QUALITY_STAGE_TIMEOUTS.writer});
      metadata.writer.push({provider:"openai",model:statuses.openai.model,latencyMs:writer.responseTimeMs});
      let draft=parseObject<WriterDraft>(writer.content);if(!validDraft(draft))throw new Error("writer_schema_invalid");
      const criticCall=await caller({provider:"openai",messages:criticMessages(input,concept,draft,concepts),temperature:.3,topP:.8,maxTokens:2200,timeoutMs:QUALITY_STAGE_TIMEOUTS.critic});
      metadata.critic.push({provider:"openai",model:statuses.openai.model,latencyMs:criticCall.responseTimeMs});
      const critique=parseObject<CriticResult>(criticCall.content);if(!validCritic(critique))throw new Error("critic_schema_invalid");
      const deterministic=deterministicQualityIssues(draft);const combined:CriticResult={pass:critique.pass&&deterministic.length===0,issues:[...critique.issues,...deterministic],preserve:critique.preserve};
      let rewriteLatency=0;
      if(!combined.pass||combined.issues.some(issue=>issue.severity!=="low")){
        metadata.rewriteTriggered=true;
        const rewrite=await caller({provider:"openai",messages:rewriteMessages(input,concept,draft,combined),temperature:.68,topP:.9,maxTokens:4200,timeoutMs:QUALITY_STAGE_TIMEOUTS.rewrite});
        metadata.rewrite.push({provider:"openai",model:statuses.openai.model,latencyMs:rewrite.responseTimeMs});
        const rewritten=parseObject<WriterDraft>(rewrite.content);if(!validDraft(rewritten))throw new Error("rewrite_schema_invalid");
        rewriteLatency=rewrite.responseTimeMs;
        if(!preservesRequiredContent(draft,rewritten,combined.preserve))throw new Error("rewrite_preserve_failed");
        if(deterministicQualityIssues(rewritten).some(issue=>issue.severity==="high"))throw new Error("rewrite_guard_failed");
        draft=rewritten;
      }
      return toPublicScript(input,concept,draft,writer.responseTimeMs+criticCall.responseTimeMs+rewriteLatency);
    }));
    if(deps.validateFinal)for(const script of scripts)deps.validateFinal(script);
    logMetadata("SCRIPT_QUALITY_ENGINE",metadata);
    return{status:"success",scripts,concepts,metadata};
  }catch(error){return fallback(safeReason(error));}
}
