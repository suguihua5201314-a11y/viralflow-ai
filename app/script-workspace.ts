import type {PersistentProject,ProjectWorkspaceSnapshot} from "./project-memory";
import {scriptRevisionIdentity} from "./script-foundation";

export type RestorableScript={revisionId?:string;sourceCreativeBriefId?:string;sourceCreativeBriefRevisionId?:string;id?:number;title:string;product:string;language:string;country:string;narration:string;[key:string]:unknown};
const isScript=(value:unknown):value is RestorableScript=>Boolean(value&&typeof value==="object"&&typeof (value as RestorableScript).title==="string"&&typeof (value as RestorableScript).narration==="string");
const identity=(script:RestorableScript)=>scriptRevisionIdentity(script);
const belongsToProject=(script:RestorableScript,project:PersistentProject)=>script.product.trim().toLowerCase()===project.product.trim().toLowerCase()&&(!project.market||!script.country||script.country===project.market)&&(!project.language||!script.language||script.language===project.language);

export function projectScriptVersions(project:PersistentProject|undefined){
 return project?[...new Map(project.assets.scriptVersions.filter(isScript).map(script=>[identity(script),script])).values()]:[];
}

export function projectScriptVersionCount(project:PersistentProject|undefined){return projectScriptVersions(project).length;}

export function resolveProjectMemorySource<T>(local:T|null|undefined,remote:T|null|undefined,fallback:T){return remote??local??fallback;}

export function restoreProjectScriptState(project:PersistentProject|undefined,snapshot:ProjectWorkspaceSnapshot){
 if(!project)return{currentScript:null,raceResults:[] as RestorableScript[],versions:[] as RestorableScript[]};
 const versions=projectScriptVersions(project),versionIds=new Set(versions.map(identity));
 const workspaceScript=isScript(snapshot.currentScript)&&(!versions.length?belongsToProject(snapshot.currentScript,project):versionIds.has(identity(snapshot.currentScript)))?snapshot.currentScript:null;
 const replication=project.assets.replicationResult&&typeof project.assets.replicationResult==="object"?((project.assets.replicationResult as {script?:unknown}).script):null;
 const replicationScript=isScript(replication)&&belongsToProject(replication,project)?replication:null;
 const currentScript=workspaceScript||versions.at(-1)||replicationScript||null;
 const restoredRaceResults=Array.isArray(snapshot.raceResults)?snapshot.raceResults.filter(isScript).filter(script=>versionIds.has(identity(script))):[];
 const raceResults=restoredRaceResults.length?restoredRaceResults:versions;
 return{currentScript,raceResults,versions};
}
