import type {PersistentProject} from "./project-memory";
import {adaptLegacyCases,type AnalysisInput,type ViralAnalysisResult,type ViralCase} from "./viral-analysis";
import type {ReplicationCandidate,ReplicationSetup,ReplicationStrategy} from "./replication-core";
import type {StructuredScript} from "./script-generation";

export type ReplicationWorkspaceAsset={
 sourceId?:string;source?:ViralCase|null;setup?:ReplicationSetup;target?:Record<string,unknown>;
 strategy?:ReplicationStrategy|null;candidates?:ReplicationCandidate[];selected?:number;
 adoptedCandidate?:ReplicationCandidate|null;adoptedScript?:StructuredScript|null;
 script?:StructuredScript;reference?:string;
};

const object=(value:unknown):value is Record<string,unknown>=>Boolean(value)&&typeof value==="object";
const analysisLike=(value:unknown):value is ViralAnalysisResult=>object(value)&&object(value.hook)&&Array.isArray(value.structure)&&object(value.score);

export function analyzerAssetToCase(asset:unknown,project?:PersistentProject):ViralCase|null{
 if(!object(asset))return null;
 if(object(asset.source)&&analysisLike(asset.analysis))return asset as unknown as ViralCase;
 if(object(asset.case)&&object(asset.case.source)&&analysisLike(asset.case.analysis))return asset.case as unknown as ViralCase;
 if(analysisLike(asset)){
  const sourceText=String(asset.hook.original||asset.summary||"").trim();
  const source:AnalysisInput={sourceText,inputType:"transcript",product:project?.product||"",market:project?.market||"",language:project?.language||"",platform:project?.platform||"TikTok",notes:"由当前项目历史 Analyzer Result 兼容恢复"};
  return{id:`project-analysis-${project?.id||"legacy"}`,title:`${project?.product||"项目"}｜${asset.hook.type||"爆款分析"}`,createdAt:project?.updatedAt||new Date(0).toISOString(),source,analysis:asset};
 }
 return adaptLegacyCases([asset])[0]||null;
}

export function buildAnalyzerAsset(input:AnalysisInput,analysis:ViralAnalysisResult,projectId?:string):ViralCase{
 return{id:`analysis-${projectId||"project"}`,title:`${input.product||input.category||"爆款内容"}｜${analysis.hook.type}`,createdAt:new Date().toISOString(),source:{...input},analysis};
}

export function restoreProjectAnalyzer(project?:PersistentProject){return analyzerAssetToCase(project?.assets.analyzerResult,project);}

export function restoreProjectReplication(project?:PersistentProject):ReplicationWorkspaceAsset|null{
 const asset=project?.assets.replicationResult;
 return object(asset)?asset as ReplicationWorkspaceAsset:null;
}

export function mergeReplicationAdoption(current:unknown,workspace:ReplicationWorkspaceAsset,candidate:ReplicationCandidate,script:StructuredScript,reference:string,setup:ReplicationSetup):ReplicationWorkspaceAsset{
 const previous=object(current)?current:{};
 return{...previous,...workspace,sourceId:workspace.sourceId||candidate.id,setup,selected:workspace.selected??0,adoptedCandidate:candidate,adoptedScript:script,script,reference};
}
