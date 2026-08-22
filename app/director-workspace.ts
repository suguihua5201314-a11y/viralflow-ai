import type {DirectorPlan,DirectorShot} from "./director-core";

export type ShotStatus="Draft"|"Confirmed"|"Shot"|"Retake";
export type WorkspaceShot=DirectorShot&{locked:boolean;status:ShotStatus};
export type IntegrityIssue={code:"hook_missing"|"reveal_missing"|"selling_point_unsupported"|"proof_missing"|"cta_missing"|"duration_mismatch"|"timeline_invalid"|"continuity_warning"|"source_block_invalid"|"context_integrity";message:string;severity:"warning"|"error"};
export type IntegrityResult={status:"Complete"|"Needs Attention";issues:IntegrityIssue[]};
export type RebalanceSummary={shots:WorkspaceShot[];beforePlanned:number;afterPlanned:number;target:number;delta:number};
export type DirectorVersion={id:string;label:string;createdAt:string;status:"Draft"|"Confirmed";contextId:string;directorPlan:DirectorPlan;shots:WorkspaceShot[]};

const round10=(value:number)=>Math.round(value*10)/10;
const minimumDuration=(shot:WorkspaceShot)=>/HOOK/i.test(shot.stage)?2.5:shot.proofRequirement||/PROOF/i.test(shot.stage)?3:/CTA/i.test(shot.stage)?1.2:.8;
export const plannedDuration=(shots:Pick<DirectorShot,"duration">[])=>round10(shots.reduce((sum,shot)=>sum+Number(shot.duration||0),0));
export function workspaceShots(shots:DirectorShot[]):WorkspaceShot[]{return recalculateTimeline(shots.map(shot=>({...shot,locked:false,status:"Draft" as const})));}
export function recalculateTimeline<T extends WorkspaceShot>(shots:T[]):T[]{let cursor=0;return shots.map((shot,index)=>{const duration=Math.max(.5,round10(Number(shot.duration)||.5));const startTime=round10(cursor);cursor=round10(cursor+duration);return{...shot,order:index+1,startTime,endTime:cursor,duration};});}
export function uniqueShotId(shots:Pick<DirectorShot,"shotId">[],prefix="shot"){const ids=new Set(shots.map(x=>x.shotId));let index=1,id="";do{id=`${prefix}-${String(index++).padStart(2,"0")}-${Date.now().toString(36)}`;}while(ids.has(id));return id;}
export function duplicateShot(shots:WorkspaceShot[],index:number){if(!shots[index])return shots;const copy={...shots[index],shotId:uniqueShotId(shots),locked:false,status:"Draft" as const};return recalculateTimeline([...shots.slice(0,index+1),copy,...shots.slice(index+1)]);}
export function deleteShot(shots:WorkspaceShot[],index:number){return recalculateTimeline(shots.filter((_,i)=>i!==index));}
export function insertShot(shots:WorkspaceShot[],index:number,shot:WorkspaceShot){return recalculateTimeline([...shots.slice(0,index+1),{...shot,shotId:uniqueShotId(shots),locked:false,status:"Draft"},...shots.slice(index+1)]);}
export function reorderShots(shots:WorkspaceShot[],from:number,to:number){if(from===to||!shots[from]||to<0||to>=shots.length)return shots;const next=[...shots],moved=next.splice(from,1)[0];next.splice(to,0,moved);return recalculateTimeline(next);}
export function autoRebalance(shots:WorkspaceShot[],target:number):RebalanceSummary{
 const beforePlanned=plannedDuration(shots),next=shots.map(x=>({...x}));let remaining=round10(target-plannedDuration(next));
 if(remaining<0){const candidates=next.map((shot,index)=>({shot,index,min:minimumDuration(shot)})).filter(x=>!x.shot.locked).sort((a,b)=>{const rank={Normal:0,High:1,Critical:2};return rank[a.shot.priority]-rank[b.shot.priority]||(/CTA/i.test(a.shot.stage)?-1:0)-(/CTA/i.test(b.shot.stage)?-1:0);});for(const item of candidates){if(remaining>=0)break;const reducible=round10(item.shot.duration-item.min);if(reducible<=0)continue;const change=Math.min(reducible,-remaining);item.shot.duration=round10(item.shot.duration-change);remaining=round10(remaining+change);}}
 else if(remaining>0){const candidates=next.map(x=>x).filter(x=>!x.locked).sort((a,b)=>Number(Boolean(b.proofRequirement))-Number(Boolean(a.proofRequirement))||({Critical:2,High:1,Normal:0}[b.priority]-{Critical:2,High:1,Normal:0}[a.priority]));let cursor=0;while(remaining>.01&&candidates.length){const change=Math.min(.5,remaining);candidates[cursor%candidates.length].duration=round10(candidates[cursor%candidates.length].duration+change);remaining=round10(remaining-change);cursor++;}}
 const balanced=recalculateTimeline(next),afterPlanned=plannedDuration(balanced);return{shots:balanced,beforePlanned,afterPlanned,target,delta:round10(afterPlanned-target)};
}
export function checkDirectorIntegrity(shots:WorkspaceShot[],target:number,sellingPoints="",validSourceBlockIds:string[]=[],contextIssues:string[]=[]):IntegrityResult{
 const issues:IntegrityIssue[]=[];const surface=shots.map(x=>`${x.stage} ${x.purpose} ${x.visualDescription} ${x.productAction} ${x.proofRequirement}`).join("\n");
 if(!shots.some(x=>/HOOK|Attention/i.test(`${x.stage} ${x.purpose}`)))issues.push({code:"hook_missing",message:"Hook 镜头缺失",severity:"error"});
 if(!shots.some(x=>/REVEAL/i.test(`${x.stage} ${x.purpose} ${x.shotType}`)))issues.push({code:"reveal_missing",message:"Product Reveal 镜头缺失",severity:"warning"});
 const proofRequired=/安装|证明|测试|防窥|无尘|气泡|install|proof|test|privacy|dust|bubble/i.test(sellingPoints);
 if(proofRequired&&!shots.some(x=>Boolean(x.proofRequirement)||/PROOF|Verification/i.test(`${x.stage} ${x.purpose}`)))issues.push({code:"proof_missing",message:"必要 Proof 镜头缺失",severity:"error"});
 if(sellingPoints.trim()&&!sellingPoints.split(/[；;\n]+/).some(point=>point.trim()&&surface.toLowerCase().includes(point.trim().toLowerCase())))issues.push({code:"selling_point_unsupported",message:"主 Selling Point 缺少明确画面支持",severity:"warning"});
 if(!shots.some(x=>/CTA|Close \/ Action/i.test(`${x.stage} ${x.purpose}`)))issues.push({code:"cta_missing",message:"CTA 镜头缺失",severity:"warning"});
 const planned=plannedDuration(shots);if(Math.abs(planned-target)>.5)issues.push({code:"duration_mismatch",message:`Planned ${planned}s 与 Target ${target}s 相差 ${round10(planned-target)}s`,severity:"warning"});
 if(shots.some((x,i)=>x.order!==i+1||x.endTime<=x.startTime||(i>0&&x.startTime!==shots[i-1].endTime)))issues.push({code:"timeline_invalid",message:"Shot order 或时间轴不连续",severity:"error"});
 const validIds=new Set(validSourceBlockIds);for(const shot of shots)if(validIds.size&&!validIds.has(shot.sourceBlockId)&&!shot.sourceBlockId.startsWith("manual:"))issues.push({code:"source_block_invalid",message:`${shot.shotId} 引用了当前脚本不存在的 ${shot.sourceBlockId}`,severity:"error"});
 for(const message of contextIssues)issues.push({code:"context_integrity",message,severity:"error"});
 const sourceOrder=shots.map(x=>Number(x.sourceBlockId.match(/(\d+)$/)?.[1]||0));if(sourceOrder.some((x,i)=>i>0&&x&&sourceOrder[i-1]&&x<sourceOrder[i-1]))issues.push({code:"continuity_warning",message:"镜头顺序与 Script Block 顺序不一致，请检查连续性",severity:"warning"});
 return{status:issues.length?"Needs Attention":"Complete",issues};
}
export function createDirectorVersion(versions:DirectorVersion[],contextId:string,directorPlan:DirectorPlan,shots:WorkspaceShot[],status:"Draft"|"Confirmed"):DirectorVersion{return{id:`director-v${versions.length+1}-${Date.now().toString(36)}`,label:`Director V${versions.length+1}`,createdAt:new Date().toISOString(),status,contextId,directorPlan:structuredClone(directorPlan),shots:structuredClone(shots)};}
