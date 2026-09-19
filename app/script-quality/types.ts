import type { ProviderId } from "../provider-types";
import type { StructuredScript } from "../script-generation";

export type QualityCreativeConcept = {
  id:string;
  creativeAngle:string;
  hookMechanism:string;
  hookLine:string;
  openingVisual:string;
  corePainPoint:string;
  primarySellingPoint:string;
  proofMechanism:string;
  creatorPersona:string;
  contentFormat:string;
  ctaDirection:string;
  riskNotes:string[];
};

export type WriterDraft = {
  creativeDirection:string;
  hook:{line:string;visual:string};
  spokenScript:string;
  shots:Array<{time:string;visual:string;line:string;edit:string}>;
  proof:{claim:string;visualEvidence:string};
  cta:string;
};

export type CriticIssue = {
  type:"hook"|"tone"|"shootability"|"proof"|"fact"|"compliance"|"diversity";
  severity:"low"|"medium"|"high";
  location:string;
  problem:string;
  rewriteInstruction:string;
};

export type CriticResult = {pass:boolean;issues:CriticIssue[];preserve:string[]};

export type ScriptQualityInput = {
  product:string;sellingPoints:string;audience:string;country:string;language:string;
  platform?:string;duration:string;offer:string;style:string;framework?:string;
  creationMode?:string;hookStrategy?:string;additionalRequirements?:string;
  referenceScript?:string;projectId?:string;requestId?:string;outputCount?:number;
  knowledgePrompt:string;
};

export type StageRun = {provider:ProviderId;model:string|null;latencyMs:number};
export type ScriptQualityMetadata = {
  requestId:string;projectId:string|null;engineMode:"quality";
  creative:StageRun|null;writer:StageRun[];critic:StageRun[];rewrite:StageRun[];
  rewriteTriggered:boolean;fallbackUsed:boolean;fallbackReason:string|null;
};

export type ScriptQualitySuccess = {
  status:"success";scripts:StructuredScript[];concepts:QualityCreativeConcept[];metadata:ScriptQualityMetadata;
};
export type ScriptQualityFallback = {status:"fallback";reason:string;metadata:ScriptQualityMetadata};
export type ScriptQualityResult = ScriptQualitySuccess|ScriptQualityFallback;
