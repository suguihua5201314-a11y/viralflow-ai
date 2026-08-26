import {callProvider,ProviderCallError} from "./provider-router";
import {directorKnowledge,scriptBlocks,type DirectorPlan,type DirectorRequest,type DirectorShot} from "./director-core";
import {findFactViolations} from "./knowledge-context";
import type {ProviderId} from "./provider-types";

export type ShotIntelligenceScores={
 hookStrength:number;
 visualImpact:number;
 productProof:number;
 conversionPotential:number;
};

export type ShotImprovementSuggestion={
 missing:string;
 visualUpgrade:string;
 conversionUpgrade:string;
};

export type ShotIntelligenceEvaluation={
 shotId:string;
 fingerprint:string;
 scores:ShotIntelligenceScores;
 suggestion:ShotImprovementSuggestion;
 evaluatedAt:string;
 provider:ProviderId;
};

export type ShotIntelligenceBatchInput={
 request:DirectorRequest;
 directorPlan:DirectorPlan;
 shots:DirectorShot[];
 contextId:string;
 provider:ProviderId;
 previousShot?:ShotIntelligenceNeighbor;
 nextShot?:ShotIntelligenceNeighbor;
 force?:boolean;
};

export type ShotIntelligenceBatchResult={
 evaluations:ShotIntelligenceEvaluation[];
 metadata:{
  providerRequested:ProviderId;
  providerUsed:ProviderId|"cache";
  responseTimeMs:number;
  cacheHits:number;
  cacheMisses:number;
  batchSize:number;
 };
};

type ProviderEvaluation={shotId?:unknown;scores?:Record<string,unknown>;suggestion?:Record<string,unknown>;suggestions?:Record<string,unknown>};
type CacheEntry={evaluation:ShotIntelligenceEvaluation;expiresAt:number};
export type ShotIntelligenceNeighbor={stage:string;purpose:string;visualDescription:string};

export const DIRECTOR_INTELLIGENCE_PROVIDER_TIMEOUT_MS=90_000;
export const DIRECTOR_INTELLIGENCE_SUGGESTION_MAX_CHARS=160;
const CACHE_TTL_MS=15*60*1000;
const CACHE_MAX_ENTRIES=240;
const intelligenceCache=new Map<string,CacheEntry>();
const text=(value:unknown)=>typeof value==="string"?value.trim():"";
const clip=(value:string,max=600)=>value.length>max?value.slice(0,max):value;
const intelligenceLog=(event:string,details:Record<string,unknown>={})=>console.log(JSON.stringify({scope:"director_intelligence",event,...details}));

function stableHash(value:string){let output=2166136261;for(let index=0;index<value.length;index++){output^=value.charCodeAt(index);output=Math.imul(output,16777619);}return(output>>>0).toString(36);}

export function shotIntelligenceFingerprint(shot:DirectorShot,contextId:string,previousShot?:DirectorShot|ShotIntelligenceNeighbor,nextShot?:DirectorShot|ShotIntelligenceNeighbor){
 const compactCurrent=(value:DirectorShot)=>({shotId:value.shotId,stage:value.stage,purpose:value.purpose,visualDescription:value.visualDescription,productAction:value.productAction,talentAction:value.talentAction,proofRequirement:value.proofRequirement,cameraMovement:value.cameraMovement,duration:value.duration,transition:value.transition});
 return`shot-intel-${stableHash(JSON.stringify({contextId,current:compactCurrent(shot),previous:compactNeighbor(previousShot),next:compactNeighbor(nextShot)}))}`;
}

function pruneCache(now=Date.now()){
 for(const [fingerprint,entry] of intelligenceCache)if(entry.expiresAt<=now)intelligenceCache.delete(fingerprint);
 while(intelligenceCache.size>CACHE_MAX_ENTRIES){const oldest=intelligenceCache.keys().next().value as string|undefined;if(!oldest)break;intelligenceCache.delete(oldest);}
}

export function readShotIntelligenceCache(fingerprint:string,now=Date.now()){
 const entry=intelligenceCache.get(fingerprint);if(!entry)return null;
 if(entry.expiresAt<=now){intelligenceCache.delete(fingerprint);return null;}
 return structuredClone(entry.evaluation);
}

export function writeShotIntelligenceCache(evaluation:ShotIntelligenceEvaluation,now=Date.now()){
 intelligenceCache.delete(evaluation.fingerprint);
 intelligenceCache.set(evaluation.fingerprint,{evaluation:structuredClone(evaluation),expiresAt:now+CACHE_TTL_MS});
 pruneCache(now);
}

export function clearShotIntelligenceCache(){intelligenceCache.clear();}
export function shotIntelligenceCacheSize(){pruneCache();return intelligenceCache.size;}

function score(value:unknown,field:string){const number=Number(value);if(!Number.isFinite(number))throw new ProviderCallError("schema_validation_error",`${field}评分无效`);return Math.max(0,Math.min(100,Math.round(number)));}
function suggestion(value:unknown,field:string){const output=clip(text(value),DIRECTOR_INTELLIGENCE_SUGGESTION_MAX_CHARS);if(!output)throw new ProviderCallError("structured_fields_missing",`${field}建议缺失`);return output;}

function parseProviderEvaluations(content:string){
 const unfenced=content.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");let parsed:{evaluations?:unknown};
 try{parsed=JSON.parse(unfenced) as typeof parsed;}catch{throw new ProviderCallError("json_parse_error","Shot Intelligence JSON 无效");}
 if(!Array.isArray(parsed.evaluations))throw new ProviderCallError("structured_fields_missing","Shot Intelligence evaluations 缺失");
 return parsed.evaluations as ProviderEvaluation[];
}

function normalizeProviderEvaluation(candidate:ProviderEvaluation,shot:DirectorShot,fingerprint:string,provider:ProviderId,evaluatedAt:string):ShotIntelligenceEvaluation{
 const scores=candidate.scores||{},advice=candidate.suggestions||candidate.suggestion||{};
 return{shotId:shot.shotId,fingerprint,scores:{hookStrength:score(scores.hookStrength,"Hook Strength"),visualImpact:score(scores.visualImpact,"Visual Impact"),productProof:score(scores.productProof,"Product Proof"),conversionPotential:score(scores.conversionPotential,"Conversion Potential")},suggestion:{missing:suggestion(advice.missing,"缺失项"),visualUpgrade:suggestion(advice.visualUpgrade,"视觉增强"),conversionUpgrade:suggestion(advice.conversionUpgrade,"转化增强")},evaluatedAt,provider};
}

function compactNeighbor(value?:DirectorShot|ShotIntelligenceNeighbor):ShotIntelligenceNeighbor|null{return value?{stage:value.stage,purpose:clip(value.purpose,100),visualDescription:clip(value.visualDescription,160)}:null;}
function intelligenceKnowledge(input:ShotIntelligenceBatchInput){const knowledge=directorKnowledge(input.request),facts=Object.entries(knowledge.facts).map(([key,value])=>`${key}:${value}`).join("；"),rules=[...knowledge.compliance.enforcedBannedExpressions,...knowledge.compliance.platformConstraints].filter(Boolean);return{facts:clip(facts,900),sellingPoints:knowledge.sellingPoints.slice(0,4),rules:rules.slice(0,8)};}
export function buildShotIntelligencePrompt(input:ShotIntelligenceBatchInput,misses:Array<{shot:DirectorShot;fingerprint:string;previousShot?:DirectorShot|ShotIntelligenceNeighbor;nextShot?:DirectorShot|ShotIntelligenceNeighbor}>){
 const shape={evaluations:[{shotId:"shot-01",scores:{hookStrength:0,visualImpact:0,productProof:0,conversionPotential:0},suggestions:{missing:"单句，最多60字",visualUpgrade:"单句，最多60字",conversionUpgrade:"单句，最多60字"}}]};
 const compactShot=({shot,previousShot,nextShot}:typeof misses[number])=>{const camera=Object.fromEntries(Object.entries({shotType:shot.shotType,framing:shot.framing,cameraAngle:shot.cameraAngle,cameraMovement:shot.cameraMovement}).filter(([,value])=>Boolean(text(value))));return{shotId:shot.shotId,stage:shot.stage,purpose:shot.purpose,duration:shot.duration,visualDescription:shot.visualDescription,productAction:shot.productAction,talentAction:shot.talentAction,proofRequirement:shot.proofRequirement,onScreenText:shot.onScreenText,...camera,previousShot:compactNeighbor(previousShot),nextShot:compactNeighbor(nextShot)};};
 const directorPlan={hookStrategy:input.directorPlan.hookExecution,pacingIntent:input.directorPlan.pacingStrategy,proofStrategy:input.directorPlan.proofStrategy,ctaIntent:input.directorPlan.ctaExecution};
 return{system:`你是短视频 Shot Intelligence 评分器。只评估 targets 中的镜头，不评估相邻上下文。每项给0-100整数：hookStrength=注意力与留存；visualImpact=画面、动作、构图；productProof=镜头职责内的事实支持；conversionPotential=卖点、利益或行动贡献。每条建议必须是具体可拍的单句，最多60字，不复述上下文，不新增任何产品事实。只返回JSON，不要Markdown：${JSON.stringify(shape)}`,user:JSON.stringify({directorPlan,knowledge:intelligenceKnowledge(input),targets:misses.map(compactShot)})};
}

export function shotIntelligenceMaxTokens(shotCount:number){return Math.min(1800,360+shotCount*220);}

async function callIntelligenceProvider(input:ShotIntelligenceBatchInput,misses:Array<{shot:DirectorShot;fingerprint:string;previousShot?:DirectorShot|ShotIntelligenceNeighbor;nextShot?:DirectorShot|ShotIntelligenceNeighbor}>){
 const testResponse=process.env.DIRECTOR_INTELLIGENCE_TEST_RESPONSE;
 if(process.env.DIRECTOR_INTELLIGENCE_TEST_MODE==="1"&&process.env.DIRECTOR_INTELLIGENCE_TEST_ERROR==="timeout")throw new ProviderCallError("timeout","Shot Intelligence provider test timeout");
 if(process.env.DIRECTOR_INTELLIGENCE_TEST_MODE==="1"&&testResponse)return{content:testResponse,responseTimeMs:1,finishReason:"stop",status:200};
 const messages=buildShotIntelligencePrompt(input,misses);intelligenceLog("provider_payload",{shotCount:misses.length,systemChars:messages.system.length,userChars:messages.user.length,totalChars:messages.system.length+messages.user.length,maxTokens:shotIntelligenceMaxTokens(misses.length),thinking:"disabled"});
 return callProvider({provider:input.provider,messages:[{role:"system",content:messages.system},{role:"user",content:messages.user}],temperature:.2,maxTokens:shotIntelligenceMaxTokens(misses.length),timeoutMs:DIRECTOR_INTELLIGENCE_PROVIDER_TIMEOUT_MS,thinking:"disabled"});
}

export async function evaluateShotIntelligenceBatch(input:ShotIntelligenceBatchInput):Promise<ShotIntelligenceBatchResult>{
 if(!input.shots.length)throw new ProviderCallError("missing_field","缺少待评估镜头");
 if(input.shots.length>24)throw new ProviderCallError("schema_validation_error","单次最多评估24个镜头");
 pruneCache();const hits=new Map<string,ShotIntelligenceEvaluation>(),misses:Array<{shot:DirectorShot;fingerprint:string;previousShot?:DirectorShot|ShotIntelligenceNeighbor;nextShot?:DirectorShot|ShotIntelligenceNeighbor}>=[];
 input.shots.forEach((shot,index)=>{const previousShot=input.shots.length===1?input.previousShot:input.shots[index-1],nextShot=input.shots.length===1?input.nextShot:input.shots[index+1],fingerprint=shotIntelligenceFingerprint(shot,input.contextId,previousShot,nextShot),cached=input.force?null:readShotIntelligenceCache(fingerprint);if(cached&&cached.shotId===shot.shotId)hits.set(shot.shotId,cached);else misses.push({shot,fingerprint,previousShot,nextShot});});
 if(hits.size)intelligenceLog("cache_hit",{count:hits.size,shotCount:input.shots.length});
 if(misses.length)intelligenceLog("cache_miss",{count:misses.length,shotCount:input.shots.length,force:Boolean(input.force)});
 if(!misses.length)return{evaluations:input.shots.map(shot=>hits.get(shot.shotId)!),metadata:{providerRequested:input.provider,providerUsed:"cache",responseTimeMs:0,cacheHits:hits.size,cacheMisses:0,batchSize:input.shots.length}};
 const providerStarted=Date.now();intelligenceLog("provider_started",{provider:input.provider,shotCount:misses.length,timeoutMs:DIRECTOR_INTELLIGENCE_PROVIDER_TIMEOUT_MS});let response:Awaited<ReturnType<typeof callIntelligenceProvider>>;
 try{response=await callIntelligenceProvider(input,misses);intelligenceLog("provider_completed",{provider:input.provider,status:response.status,durationMs:response.responseTimeMs,contentLength:response.content.length,finishReason:response.finishReason});}
 catch(error){const category=error instanceof ProviderCallError?error.category:"provider_http_error",event=category==="timeout"?"provider_timeout":"provider_error";intelligenceLog(event,{provider:input.provider,category,durationMs:Date.now()-providerStarted});throw error;}
 intelligenceLog("parse_started",{contentLength:response.content.length});const raw=parseProviderEvaluations(response.content);intelligenceLog("parse_completed",{evaluationCount:raw.length});const byId=new Map<string,ProviderEvaluation>();
 for(const candidate of raw){const shotId=text(candidate.shotId);if(!shotId||byId.has(shotId))throw new ProviderCallError("schema_validation_error","Shot Intelligence 包含重复或无效 shotId");byId.set(shotId,candidate);}
 intelligenceLog("schema_validation_started",{expectedCount:misses.length,actualCount:byId.size});
 const expected=new Set(misses.map(item=>item.shot.shotId));if(byId.size!==expected.size||[...byId.keys()].some(shotId=>!expected.has(shotId)))throw new ProviderCallError("schema_validation_error","Shot Intelligence 返回镜头与请求不一致");
 const evaluatedAt=new Date().toISOString(),knowledge=directorKnowledge(input.request),grounding=scriptBlocks(input.request.script).flatMap(block=>[block.text,block.visual]).join("\n"),created=new Map<string,ShotIntelligenceEvaluation>();
 for(const item of misses){const candidate=byId.get(item.shot.shotId);if(!candidate)throw new ProviderCallError("structured_fields_missing",`缺少 ${item.shot.shotId} 评分`);created.set(item.shot.shotId,normalizeProviderEvaluation(candidate,item.shot,item.fingerprint,input.provider,evaluatedAt));}
 intelligenceLog("schema_validation_completed",{evaluationCount:created.size});
 for(const evaluation of created.values()){const surface=Object.values(evaluation.suggestion).join("\n"),violations=findFactViolations(surface,knowledge,grounding);if(violations.length)throw new ProviderCallError("fact_validation_error",violations.join("；"));}
 intelligenceLog("fact_validation_completed",{evaluationCount:created.size});
 for(const evaluation of created.values())writeShotIntelligenceCache(evaluation);
 return{evaluations:input.shots.map(shot=>hits.get(shot.shotId)||created.get(shot.shotId)!),metadata:{providerRequested:input.provider,providerUsed:input.provider,responseTimeMs:response.responseTimeMs,cacheHits:hits.size,cacheMisses:misses.length,batchSize:input.shots.length}};
}
