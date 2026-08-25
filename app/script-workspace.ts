import type {PersistentProject,ProjectWorkspaceSnapshot} from "./project-memory";

export type RestorableScript={id?:number;title:string;product:string;language:string;country:string;narration:string;[key:string]:unknown};
const isScript=(value:unknown):value is RestorableScript=>Boolean(value&&typeof value==="object"&&typeof (value as RestorableScript).title==="string"&&typeof (value as RestorableScript).narration==="string");
const identity=(script:RestorableScript)=>script.id?`id:${script.id}`:`copy:${script.title}|${script.product}|${script.narration}`;
const belongsToProject=(script:RestorableScript,project:PersistentProject)=>script.product.trim().toLowerCase()===project.product.trim().toLowerCase()&&(!project.market||!script.country||script.country===project.market)&&(!project.language||!script.language||script.language===project.language);

export function restoreProjectScriptState(project:PersistentProject|undefined,snapshot:ProjectWorkspaceSnapshot){
 if(!project)return{currentScript:null,raceResults:[] as RestorableScript[],versions:[] as RestorableScript[]};
 const versions=[...new Map(project.assets.scriptVersions.filter(isScript).map(script=>[identity(script),script])).values()],versionIds=new Set(versions.map(identity));
 const workspaceScript=isScript(snapshot.currentScript)&&belongsToProject(snapshot.currentScript,project)&&(!versions.length||versionIds.has(identity(snapshot.currentScript)))?snapshot.currentScript:null;
 const replication=project.assets.replicationResult&&typeof project.assets.replicationResult==="object"?((project.assets.replicationResult as {script?:unknown}).script):null;
 const replicationScript=isScript(replication)&&belongsToProject(replication,project)?replication:null;
 const currentScript=workspaceScript||versions.at(-1)||replicationScript||null;
 const restoredRaceResults=Array.isArray(snapshot.raceResults)?snapshot.raceResults.filter(isScript).filter(script=>belongsToProject(script,project)&&versionIds.has(identity(script))):[];
 const raceResults=restoredRaceResults.length?restoredRaceResults:versions;
 return{currentScript,raceResults,versions};
}
