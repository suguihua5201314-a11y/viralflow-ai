import type {PersistentProject,ProjectWorkspaceSnapshot,ProjectMemory,ResolvedProjectWorkspace} from "./project-memory";
import {resolveProjectMemoryState} from "./project-memory";
import {scriptRevisionIdentity} from "./script-foundation";

export type RestorableScript={revisionId?:string;sourceCreativeBriefId?:string;sourceCreativeBriefRevisionId?:string;id?:number;title:string;product:string;language:string;country:string;narration:string;[key:string]:unknown};
const isScript=(value:unknown):value is RestorableScript=>Boolean(value&&typeof value==="object"&&typeof (value as RestorableScript).title==="string"&&typeof (value as RestorableScript).narration==="string");
const identity=(script:RestorableScript)=>scriptRevisionIdentity(script);
const belongsToProject=(script:RestorableScript,project:PersistentProject)=>script.product.trim().toLowerCase()===project.product.trim().toLowerCase()&&(!project.market||!script.country||script.country===project.market)&&(!project.language||!script.language||script.language===project.language);

export function projectScriptVersions(project:PersistentProject|undefined){
 return project?[...new Map(project.assets.scriptVersions.filter(isScript).map(script=>[identity(script),script])).values()]:[];
}

export function projectScriptVersionCount(project:PersistentProject|undefined){return projectScriptVersions(project).length;}

export function resolveProjectMemorySource(local:ProjectMemory|null|undefined,remote:ProjectMemory|null|undefined,fallback:ProjectMemory){return resolveProjectMemoryState(local,remote,fallback).memory;}

export function restoreProjectScriptState(project:PersistentProject|undefined,snapshot:ProjectWorkspaceSnapshot|ResolvedProjectWorkspace){
 if(!project)return{currentScript:null,raceResults:[] as RestorableScript[],versions:[] as RestorableScript[]};
 const versions=projectScriptVersions(project),versionIds=new Set(versions.map(identity));
 const selectedId="selectedScriptRevisionId" in snapshot?snapshot.selectedScriptRevisionId:undefined;
 const selectedScript=selectedId?versions.find(script=>identity(script)===selectedId)||null:null;
 const legacyScript="legacyCurrentScript" in snapshot?snapshot.legacyCurrentScript:"currentScript" in snapshot?snapshot.currentScript:undefined;
 const workspaceScript=isScript(legacyScript)&&(!versions.length?belongsToProject(legacyScript,project):versionIds.has(identity(legacyScript)))?legacyScript:null;
 const replication=project.assets.replicationResult&&typeof project.assets.replicationResult==="object"?((project.assets.replicationResult as {script?:unknown}).script):null;
 const replicationScript=isScript(replication)&&belongsToProject(replication,project)?replication:null;
 const currentScript=selectedScript||workspaceScript||versions.at(-1)||replicationScript||null;
 const legacyRace="legacyRaceResults" in snapshot?snapshot.legacyRaceResults:"raceResults" in snapshot?snapshot.raceResults:undefined;
 const restoredRaceResults=Array.isArray(legacyRace)?legacyRace.filter(isScript).filter(script=>versionIds.has(identity(script))):[];
 const raceResults=restoredRaceResults.length?restoredRaceResults:versions;
 return{currentScript,raceResults,versions};
}
