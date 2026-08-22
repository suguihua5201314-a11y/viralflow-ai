export type EvidenceKind="observed"|"analysis"|"suggestion";
export type AnalysisInput={
  sourceText:string; inputType:"copy"|"transcript"; platform?:string; market?:string; language?:string;
  durationSeconds?:number; product?:string; category?:string; views?:string; likes?:string; comments?:string;
  shares?:string; saves?:string; gmv?:string; sourceUrl?:string; notes?:string; visualNotes?:string;
};
export type StructureStage={stage:string;content:string;purpose:string;viewerPsychology:string};
export type TimelineItem={start:string;end:string;stage:string;spokenContent:string;visualDescription:string;editingNote:string;purpose:string;retentionMechanism:string};
export type EvidenceItem={value:string;basis:EvidenceKind};
export type AnalysisScore={hookStrength:number;structureClarity:number;proofStrength:number;informationDensity:number;ctaIntegration:number;replicability:number;total:number;explanation:string[]};
export type ViralAnalysisResult={
  summary:string;contentType:string;targetAudience:string;corePromise:string;creativeAngle:string;
  hook:{original:string;type:string;mechanism:string;informationGap:string;conflict:string;curiosity:string;promise:string;payoff:string;whyItWorks:string};
  structure:StructureStage[];pacing:{assessment:string;retentionBeats:string[]};emotionCurve:Array<{stage:string;emotion:string;trigger:string}>;
  sellingPoints:Array<{point:string;priority:"primary"|"secondary";evidence:string}>;proofMechanisms:Array<{type:string;content:string;observed:boolean}>;
  objections:string[];productReveal:string;cta:string;ctaStyle:string;viralMechanisms:string[];reusableFormula:string[];
  replicationNotes:{visualSuggestions:string[];copySuggestions:string[];editingSuggestions:string[]};risks:string[];timeline:TimelineItem[];
  score:AnalysisScore;metadata:{analysisProvider:string;inputType:string;transcriptProvided:boolean;visualEvidenceAvailable:boolean;timelineEstimated:boolean;productContextUsed:boolean;marketContextUsed:boolean;scoringModel:"viralflow-rule-v1"};
};
export type ViralCase={id:string;title:string;createdAt:string;source:AnalysisInput;analysis:ViralAnalysisResult;legacy?:boolean};

const text=(value:unknown,fallback="未识别")=>typeof value==="string"&&value.trim()?value.trim():fallback;
const list=(value:unknown)=>Array.isArray(value)?value.map(item=>text(item,"")).filter(Boolean):[];
const clamp=(value:unknown,fallback:number)=>Math.max(0,Math.min(100,Number.isFinite(Number(value))?Math.round(Number(value)):fallback));

export function scoreAnalysis(result:Pick<ViralAnalysisResult,"hook"|"structure"|"proofMechanisms"|"cta"|"pacing"|"reusableFormula">):AnalysisScore{
  const hookStrength=clamp(40+(result.hook.original.length>=8?15:0)+(result.hook.mechanism!=="未识别"?20:0)+(result.hook.payoff!=="未识别"?15:0),55);
  const structureClarity=clamp(35+Math.min(45,result.structure.length*9)+(result.structure.every(item=>item.purpose&&item.viewerPsychology)?10:0),55);
  const observedProof=result.proofMechanisms.filter(item=>item.observed).length;
  const proofStrength=clamp(30+Math.min(55,observedProof*18),30);
  const beats=result.pacing.retentionBeats.length;
  const informationDensity=clamp(35+Math.min(50,beats*10),45);
  const ctaIntegration=clamp(result.cta&&result.cta!=="未识别"?70:30,30);
  const replicability=clamp(35+Math.min(55,result.reusableFormula.length*10),45);
  const total=Math.round((hookStrength+structureClarity+proofStrength+informationDensity+ctaIntegration+replicability)/6);
  return {hookStrength,structureClarity,proofStrength,informationDensity,ctaIntegration,replicability,total,explanation:["Hook：原文、注意力机制与后文兑现是否完整","结构：阶段、目的与观众心理是否可辨识","Proof：只计算原内容中可观察到的证明","信息密度：按可识别的Retention Beats计分","CTA：是否存在且承接前文","可复刻性：公式是否拆成可执行步骤"]};
}

export function normalizeAnalysis(raw:unknown,input:AnalysisInput):ViralAnalysisResult{
  const r=(raw&&typeof raw==="object"?raw:{}) as Record<string,unknown>; const h=(r.hook&&typeof r.hook==="object"?r.hook:{}) as Record<string,unknown>;
  const visualAvailable=Boolean(input.visualNotes?.trim()); const timelineEstimated=Boolean(input.durationSeconds)&&!/[\[(]?\d{1,2}:\d{2}/.test(input.sourceText);
  const structure=(Array.isArray(r.structure)?r.structure:[]).map(item=>{const x=(item&&typeof item==="object"?item:{}) as Record<string,unknown>;return {stage:text(x.stage),content:text(x.content,"原文未明确"),purpose:text(x.purpose),viewerPsychology:text(x.viewerPsychology)}});
  const proofMechanisms=(Array.isArray(r.proofMechanisms)?r.proofMechanisms:[]).map(item=>{const x=(item&&typeof item==="object"?item:{}) as Record<string,unknown>;return {type:text(x.type),content:text(x.content),observed:x.observed===true}});
  const timeline=(Array.isArray(r.timeline)?r.timeline:[]).map(item=>{const x=(item&&typeof item==="object"?item:{}) as Record<string,unknown>;return {start:text(x.start,"—"),end:text(x.end,"—"),stage:text(x.stage),spokenContent:text(x.spokenContent,"原文未明确"),visualDescription:visualAvailable?text(x.visualDescription,input.visualNotes):"unknown / not provided",editingNote:visualAvailable?text(x.editingNote):"unknown / not provided",purpose:text(x.purpose),retentionMechanism:text(x.retentionMechanism)}});
  const result={
    summary:text(r.summary),contentType:text(r.contentType),targetAudience:text(r.targetAudience),corePromise:text(r.corePromise),creativeAngle:text(r.creativeAngle),
    hook:{original:text(h.original,input.sourceText.split(/\n|(?<=[.!?。！？])/)[0]?.slice(0,220)),type:text(h.type),mechanism:text(h.mechanism),informationGap:text(h.informationGap),conflict:text(h.conflict,"未明显使用"),curiosity:text(h.curiosity),promise:text(h.promise),payoff:text(h.payoff),whyItWorks:text(h.whyItWorks)},
    structure,pacing:{assessment:text((r.pacing as Record<string,unknown>)?.assessment),retentionBeats:list((r.pacing as Record<string,unknown>)?.retentionBeats)},
    emotionCurve:(Array.isArray(r.emotionCurve)?r.emotionCurve:[]).map(item=>{const x=item as Record<string,unknown>;return {stage:text(x.stage),emotion:text(x.emotion),trigger:text(x.trigger)}}),
    sellingPoints:(Array.isArray(r.sellingPoints)?r.sellingPoints:[]).map(item=>{const x=item as Record<string,unknown>;return {point:text(x.point),priority:x.priority==="primary"?"primary" as const:"secondary" as const,evidence:text(x.evidence)}}),
    proofMechanisms,objections:list(r.objections),productReveal:text(r.productReveal),cta:text(r.cta),ctaStyle:text(r.ctaStyle),viralMechanisms:list(r.viralMechanisms),reusableFormula:list(r.reusableFormula),
    replicationNotes:{visualSuggestions:list((r.replicationNotes as Record<string,unknown>)?.visualSuggestions),copySuggestions:list((r.replicationNotes as Record<string,unknown>)?.copySuggestions),editingSuggestions:list((r.replicationNotes as Record<string,unknown>)?.editingSuggestions)},risks:list(r.risks),timeline,
    metadata:{analysisProvider:"deepseek",inputType:input.inputType,transcriptProvided:input.inputType==="transcript",visualEvidenceAvailable:visualAvailable,timelineEstimated,productContextUsed:Boolean(input.product?.trim()),marketContextUsed:Boolean(input.market?.trim()),scoringModel:"viralflow-rule-v1" as const},
  };
  return {...result,score:scoreAnalysis(result)};
}

export function adaptLegacyCases(value:unknown):ViralCase[]{
  if(!Array.isArray(value))return [];
  return value.flatMap((item,index)=>{if(!item||typeof item!=="object")return [];const x=item as Record<string,unknown>;
    if(x.analysis&&x.source)return [x as unknown as ViralCase];
    const sourceText=text(x.transcript||x.sourceText||x.summary,"");if(!sourceText)return [];
    const input:AnalysisInput={sourceText,inputType:"transcript",product:text(x.product,""),notes:"由历史 VideoAnalyzer 兼容读取"};
    const analysis=normalizeAnalysis({summary:x.summary,hook:{original:x.hook},structure:x.structure,viralMechanisms:list(x.insights),reusableFormula:list(x.formula),risks:list(x.risks)},input);
    return [{id:text(x.id,`legacy-${index}`),title:text(x.title,"历史视频分析"),createdAt:text(x.createdAt,new Date(0).toISOString()),source:input,analysis,legacy:true}];
  });
}

export function viralCaseReference(item:ViralCase){const a=item.analysis;return `[VIRALFLOW_CASE_V1]\nHook Mechanism: ${a.hook.mechanism}\nCreative Angle: ${a.creativeAngle}\nPacing: ${a.pacing.assessment}\nInformation Order: ${a.structure.map(x=>x.stage).join(" → ")}\nConflict: ${a.hook.conflict}\nProof: ${a.proofMechanisms.map(x=>x.type).join("；")||"未明确"}\nCTA Style: ${a.ctaStyle}\nReusable Formula: ${a.reusableFormula.join(" → ")}\n[Source Transcript]\n${item.source.sourceText}`;}
