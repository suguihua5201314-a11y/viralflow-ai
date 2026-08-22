import {textSimilarity,type CreativeConcept,type StructuredScript} from "./script-generation";
import type {ProductKnowledge} from "./knowledge-context";
import type {ViralCase} from "./viral-analysis";

export type ReplicationMode="structure"|"hook"|"pacing"|"proof"|"formula"|"free";
export type ReplicationIntensity="low"|"medium"|"high";
export type ReplicationSetup={mode:ReplicationMode;intensity:ReplicationIntensity;market:string;language:string;platform:string;duration:string;instruction?:string};
export type ReplicationStrategy={
  sourceMechanism:string[];transferableElements:string[];nonTransferableElements:string[];targetProductFit:string;targetAudienceFit:string;
  hookPlan:string;structurePlan:string[];scenarioPlan:string;proofPlan:string;sellingPointPlan:string;ctaPlan:string;originalityPlan:string;
  sellingPointMapping:Array<{sourceFunction:string;targetSellingPoint:string;reason:string}>;
  proofMapping:Array<{sourceProofFunction:string;targetProof:string;reason:string}>;
};
export type ReplicationConcept=CreativeConcept&{direction:"Faithful Mechanism"|"Product Native"|"Creative Mutation";sourceMechanismRetained:string[];originalElementsIntroduced:string[];whyThisAdaptation:string};
export type SimilarityResult={sourceSimilarityChecked:true;phraseOverlap:number;hookExpressionOverlap:number;hookMechanismSimilarity:number;structureSimilarity:number;ctaExpressionOverlap:number;distinctivePhraseFound:boolean;sourceLeakage:string[];originalityPassed:boolean;regenerated:boolean;reasons:string[]};
export type ReplicationCandidate={id:string;concept:ReplicationConcept;script:StructuredScript;similarity:SimilarityResult;regenerationAttempts:number};

const normalize=(value:string)=>value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu,"");
function allowedPoint(value:string|undefined,allowed:string[]){const key=normalize(value||"");return key?allowed.find(point=>{const candidate=normalize(point);return candidate===key||candidate.includes(key)||key.includes(candidate)}):undefined;}
export function alignReplicationSellingPoints(concepts:ReplicationConcept[],strategy:ReplicationStrategy,allowed:string[],productPrimary:string){
  const points=[...new Set(allowed.map(point=>point.trim()).filter(Boolean))];
  const primary=allowedPoint(productPrimary,points)??points[0]??"";
  const mapped=strategy.sellingPointMapping.map(item=>allowedPoint(item.targetSellingPoint,points)).find(Boolean);
  const used=new Set<string>();
  return concepts.map(concept=>{
    const providerChoice=allowedPoint(concept.sellingPointPriority,points);
    let selected=concept.direction==="Faithful Mechanism"?(mapped??providerChoice??primary):concept.direction==="Product Native"?(primary||providerChoice||mapped||""):(providerChoice&&!used.has(providerChoice)?providerChoice:points.find(point=>!used.has(point))??primary);
    selected=allowedPoint(selected,points)??primary;
    if(selected)used.add(selected);
    return {...concept,sellingPointPriority:selected};
  });
}
const words=(value:string)=>value.toLowerCase().match(/[a-záéíóúüñ0-9]+|[\u3400-\u9fff]/giu)||[];
function phraseOverlap(source:string,target:string){const a=words(source),b=words(target);if(!a.length||!b.length)return 0;const n=/[\u3400-\u9fff]/u.test(source)?8:5;const set=new Set(Array.from({length:Math.max(0,a.length-n+1)},(_,i)=>a.slice(i,i+n).join(" ")));if(!set.size)return 0;let same=0;for(let i=0;i<=b.length-n;i++)if(set.has(b.slice(i,i+n).join(" ")))same++;return Math.min(1,same/Math.max(1,Math.floor(b.length/n)));}
function sourceLeakage(source:string,target:string,knowledge?:ProductKnowledge){
  const targetFacts=normalize(Object.values(knowledge||{}).join(" "));const output=normalize(target);const leaks:string[]=[];
  const numbers=[...source.matchAll(/(?:[$€£]\s*)?\b\d+(?:[.,]\d+)?\s*(?:%|°|mm|cm|mah|w|秒|s|hours?|hrs?|小时)?\b/giu)].map(x=>x[0]).filter(x=>/[\d][$€£%°]|[$€£]|(?:mm|cm|mah|w|秒|hours?|hrs?|小时)/iu.test(x));
  for(const claim of numbers)if(output.includes(normalize(claim))&&!targetFacts.includes(normalize(claim)))leaks.push(`Source参数未在Target Facts中:${claim}`);
  const authority=[...source.matchAll(/military[- ]grade|certified|approved|patented|clinical(?:ly)?|军工级|认证|专利|临床/giu)].map(x=>x[0]);
  for(const claim of authority)if(output.includes(normalize(claim))&&!targetFacts.includes(normalize(claim)))leaks.push(`Source认证/背书未在Target Facts中:${claim}`);
  return [...new Set(leaks)];
}
export function assessSourceSimilarity(sourceCase:ViralCase,script:StructuredScript,knowledge?:ProductKnowledge,regenerated=false):SimilarityResult{
  const source=sourceCase.source.sourceText;const sourceHook=sourceCase.analysis.hook.original||source.split(/\n|(?<=[.!?。！？])/)[0]||source;const target=[script.hook,script.narration].join("\n");
  const phrase=phraseOverlap(source,target),hookExpression=textSimilarity(sourceHook,script.hook||""),cta=textSimilarity(sourceCase.analysis.cta||"",script.cta||"");
  const sourceStages=sourceCase.analysis.structure.map(x=>x.stage).join(" "),targetStages=[script.hookType,script.conflict&&"Conflict",script.productReveal&&"Product Reveal",script.proof&&"Proof",script.cta&&"CTA"].filter(Boolean).join(" ");
  const structure=textSimilarity(sourceStages,targetStages);const mechanism=textSimilarity(sourceCase.analysis.hook.mechanism,script.concept?.hookMechanism||script.hookType||"");
  const compactSource=normalize(source),compactTarget=normalize(target);const distinctive=compactSource.length>=20&&Array.from({length:Math.max(0,compactSource.length-19)},(_,i)=>compactSource.slice(i,i+20)).some(x=>compactTarget.includes(x));
  const leakage=sourceLeakage(source,target,knowledge);const reasons:string[]=[];
  if(phrase>.12)reasons.push("发现连续短语复用");if(hookExpression>.64)reasons.push("Hook表达过度接近Source");if(cta>.72)reasons.push("CTA表达过度接近Source");if(distinctive)reasons.push("发现Source独特连续表达");if(leakage.length)reasons.push("发现Source Facts泄漏");
  return {sourceSimilarityChecked:true,phraseOverlap:Number(phrase.toFixed(3)),hookExpressionOverlap:Number(hookExpression.toFixed(3)),hookMechanismSimilarity:Number(mechanism.toFixed(3)),structureSimilarity:Number(structure.toFixed(3)),ctaExpressionOverlap:Number(cta.toFixed(3)),distinctivePhraseFound:distinctive,sourceLeakage:leakage,originalityPassed:reasons.length===0,regenerated,reasons};
}
export function replicationReference(sourceCase:ViralCase,strategy:ReplicationStrategy,setup:ReplicationSetup){const a=sourceCase.analysis;return `[VIRALFLOW_REPLICATION_V1]\nReplication Mode: ${setup.mode}\nIntensity: ${setup.intensity}\nHook Mechanism: ${a.hook.mechanism}\nCreative Angle: ${a.creativeAngle}\nPacing: ${a.pacing.assessment}\nInformation Order: ${a.structure.map(x=>x.stage).join(" → ")}\nConflict: ${a.hook.conflict}\nProof: ${a.proofMechanisms.map(x=>x.type).join("；")||"未明确"}\nCTA Style: ${a.ctaStyle}\nReusable Formula: ${a.reusableFormula.join(" → ")}\nTransferable: ${strategy.transferableElements.join("；")}\nDo Not Transfer: ${strategy.nonTransferableElements.join("；")}\n[Source Transcript]\n${sourceCase.source.sourceText}`;}
