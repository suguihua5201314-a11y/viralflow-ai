import {callProvider,ProviderCallError} from "./provider-router";
import {directorKnowledge,scriptBlocks,type DirectorPlan,type DirectorRequest,type DirectorShot} from "./director-core";
import {findFactViolations,renderKnowledgeContext} from "./knowledge-context";
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

type ProviderEvaluation={shotId?:unknown;scores?:Record<string,unknown>;suggestion?:Record<string,unknown>};
type CacheEntry={evaluation:ShotIntelligenceEvaluation;expiresAt:number};

const CACHE_TTL_MS=15*60*1000;
const CACHE_MAX_ENTRIES=240;
const intelligenceCache=new Map<string,CacheEntry>();
const text=(value:unknown)=>typeof value==="string"?value.trim():"";
const clip=(value:string,max=600)=>value.length>max?value.slice(0,max):value;

function stableHash(value:string){let output=2166136261;for(let index=0;index<value.length;index++){output^=value.charCodeAt(index);output=Math.imul(output,16777619);}return(output>>>0).toString(36);}

export function shotIntelligenceFingerprint(shot:DirectorShot,contextId:string,previousShot?:DirectorShot,nextShot?:DirectorShot){
 const compact=(value?:DirectorShot)=>value?{shotId:value.shotId,stage:value.stage,purpose:value.purpose,visualDescription:value.visualDescription,productAction:value.productAction,talentAction:value.talentAction,proofRequirement:value.proofRequirement,cameraMovement:value.cameraMovement,duration:value.duration,transition:value.transition}:null;
 return`shot-intel-${stableHash(JSON.stringify({contextId,current:compact(shot),previous:compact(previousShot),next:compact(nextShot)}))}`;
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
function suggestion(value:unknown,field:string){const output=clip(text(value));if(!output)throw new ProviderCallError("structured_fields_missing",`${field}建议缺失`);return output;}

function parseProviderEvaluations(content:string){
 const unfenced=content.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"");let parsed:{evaluations?:unknown};
 try{parsed=JSON.parse(unfenced) as typeof parsed;}catch{throw new ProviderCallError("json_parse_error","Shot Intelligence JSON 无效");}
 if(!Array.isArray(parsed.evaluations))throw new ProviderCallError("structured_fields_missing","Shot Intelligence evaluations 缺失");
 return parsed.evaluations as ProviderEvaluation[];
}

function normalizeProviderEvaluation(candidate:ProviderEvaluation,shot:DirectorShot,fingerprint:string,provider:ProviderId,evaluatedAt:string):ShotIntelligenceEvaluation{
 const scores=candidate.scores||{},advice=candidate.suggestion||{};
 return{shotId:shot.shotId,fingerprint,scores:{hookStrength:score(scores.hookStrength,"Hook Strength"),visualImpact:score(scores.visualImpact,"Visual Impact"),productProof:score(scores.productProof,"Product Proof"),conversionPotential:score(scores.conversionPotential,"Conversion Potential")},suggestion:{missing:suggestion(advice.missing,"缺失项"),visualUpgrade:suggestion(advice.visualUpgrade,"视觉增强"),conversionUpgrade:suggestion(advice.conversionUpgrade,"转化增强")},evaluatedAt,provider};
}

function intelligencePrompt(input:ShotIntelligenceBatchInput,misses:Array<{shot:DirectorShot;fingerprint:string;previousShot?:DirectorShot;nextShot?:DirectorShot}>){
 const knowledge=directorKnowledge(input.request),shape={evaluations:[{shotId:"shot-01",scores:{hookStrength:0,visualImpact:0,productProof:0,conversionPotential:0},suggestion:{missing:"string",visualUpgrade:"string",conversionUpgrade:"string"}}]};
 const shots=misses.map(({shot,previousShot,nextShot})=>({shotId:shot.shotId,stage:shot.stage,purpose:shot.purpose,startTime:shot.startTime,endTime:shot.endTime,duration:shot.duration,shotType:shot.shotType,framing:shot.framing,cameraAngle:shot.cameraAngle,cameraMovement:shot.cameraMovement,visualDescription:shot.visualDescription,subject:shot.subject,productAction:shot.productAction,talentAction:shot.talentAction,dialogue:shot.dialogue,voiceover:shot.voiceover,onScreenText:shot.onScreenText,proofRequirement:shot.proofRequirement,transition:shot.transition,editingNotes:shot.editingNotes,priority:shot.priority,previousShot:previousShot?{shotId:previousShot.shotId,purpose:previousShot.purpose,visualDescription:previousShot.visualDescription}:null,nextShot:nextShot?{shotId:nextShot.shotId,purpose:nextShot.purpose,visualDescription:nextShot.visualDescription}:null}));
 return{system:`你是短视频商业导演的 Shot Intelligence 评分器。你只评估给定镜头，不重写脚本，不生成新产品事实。为每个镜头分别给出0到100的整数评分：Hook Strength衡量该镜头对注意力与留存的贡献；Visual Impact衡量画面清晰度、动作可见性、构图和视觉变化；Product Proof衡量该镜头在自身结构职责内对产品事实的支持与可验证性，非Proof镜头不因没有独立实验而机械扣分；Conversion Potential衡量卖点、用户利益、产品出场或行动引导的转化贡献。建议必须简短、具体、可拍，只能调整镜头表达；不得新增未提供的功能、参数、包装、效果、认证、价格、赠品、库存或促销。严格返回JSON，不要Markdown，结构为：${JSON.stringify(shape)}\n${renderKnowledgeContext(knowledge)}`,user:JSON.stringify({contextId:input.contextId,platform:input.request.context.platform,market:input.request.context.market,creativeMode:input.request.context.creativeMode,hookStrategy:input.request.context.hookStrategy,creativeAngle:input.request.context.creativeAngle,directorPlan:input.directorPlan,shots})};
}

async function callIntelligenceProvider(input:ShotIntelligenceBatchInput,misses:Array<{shot:DirectorShot;fingerprint:string;previousShot?:DirectorShot;nextShot?:DirectorShot}>){
 const testResponse=process.env.DIRECTOR_INTELLIGENCE_TEST_RESPONSE;
 if(process.env.DIRECTOR_INTELLIGENCE_TEST_MODE==="1"&&testResponse)return{content:testResponse,responseTimeMs:1};
 const messages=intelligencePrompt(input,misses);
 return callProvider({provider:input.provider,messages:[{role:"system",content:messages.system},{role:"user",content:messages.user}],temperature:.2,maxTokens:Math.min(5200,900+misses.length*260),timeoutMs:45000});
}

export async function evaluateShotIntelligenceBatch(input:ShotIntelligenceBatchInput):Promise<ShotIntelligenceBatchResult>{
 if(!input.shots.length)throw new ProviderCallError("missing_field","缺少待评估镜头");
 if(input.shots.length>24)throw new ProviderCallError("schema_validation_error","单次最多评估24个镜头");
 pruneCache();const hits=new Map<string,ShotIntelligenceEvaluation>(),misses:Array<{shot:DirectorShot;fingerprint:string;previousShot?:DirectorShot;nextShot?:DirectorShot}>=[];
 input.shots.forEach((shot,index)=>{const previousShot=input.shots[index-1],nextShot=input.shots[index+1],fingerprint=shotIntelligenceFingerprint(shot,input.contextId,previousShot,nextShot),cached=input.force?null:readShotIntelligenceCache(fingerprint);if(cached&&cached.shotId===shot.shotId)hits.set(shot.shotId,cached);else misses.push({shot,fingerprint,previousShot,nextShot});});
 if(!misses.length)return{evaluations:input.shots.map(shot=>hits.get(shot.shotId)!),metadata:{providerRequested:input.provider,providerUsed:"cache",responseTimeMs:0,cacheHits:hits.size,cacheMisses:0,batchSize:input.shots.length}};
 const response=await callIntelligenceProvider(input,misses),raw=parseProviderEvaluations(response.content),byId=new Map<string,ProviderEvaluation>();
 for(const candidate of raw){const shotId=text(candidate.shotId);if(!shotId||byId.has(shotId))throw new ProviderCallError("schema_validation_error","Shot Intelligence 包含重复或无效 shotId");byId.set(shotId,candidate);}
 const expected=new Set(misses.map(item=>item.shot.shotId));if(byId.size!==expected.size||[...byId.keys()].some(shotId=>!expected.has(shotId)))throw new ProviderCallError("schema_validation_error","Shot Intelligence 返回镜头与请求不一致");
 const evaluatedAt=new Date().toISOString(),knowledge=directorKnowledge(input.request),grounding=scriptBlocks(input.request.script).flatMap(block=>[block.text,block.visual]).join("\n"),created=new Map<string,ShotIntelligenceEvaluation>();
 for(const item of misses){const candidate=byId.get(item.shot.shotId);if(!candidate)throw new ProviderCallError("structured_fields_missing",`缺少 ${item.shot.shotId} 评分`);const evaluation=normalizeProviderEvaluation(candidate,item.shot,item.fingerprint,input.provider,evaluatedAt),surface=Object.values(evaluation.suggestion).join("\n"),violations=findFactViolations(surface,knowledge,grounding);if(violations.length)throw new ProviderCallError("fact_validation_error",violations.join("；"));created.set(item.shot.shotId,evaluation);}
 for(const evaluation of created.values())writeShotIntelligenceCache(evaluation);
 return{evaluations:input.shots.map(shot=>hits.get(shot.shotId)||created.get(shot.shotId)!),metadata:{providerRequested:input.provider,providerUsed:input.provider,responseTimeMs:response.responseTimeMs,cacheHits:hits.size,cacheMisses:misses.length,batchSize:input.shots.length}};
}
