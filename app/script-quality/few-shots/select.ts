import type { CriticIssue, QualityCreativeConcept, ScriptQualityInput, WriterDraft } from "../types";
import { scriptQualityFewShotLibrary } from "./library";
import type { FewShotQuery, FewShotSelectionOptions, ScriptQualityFewShot } from "./types";

const fold=(value:unknown)=>String(value||"").trim().toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,"");
const related=(left?:string,right?:string)=>{const a=fold(left),b=fold(right);return Boolean(a&&b&&(a===b||a.includes(b)||b.includes(a)));};

const weights:Array<[keyof FewShotQuery,number]>=[
  ["market",3],["platform",3],["productCategory",4],["contentFormat",3],["creatorPersona",2],
  ["hookMechanism",4],["primarySellingPoint",2],["proofMechanism",4],["language",3],
];
export const MIN_RELEVANCE_SCORE=10;

export function scoreFewShot(entry:ScriptQualityFewShot,query:FewShotQuery){
  return weights.reduce((score,[key,weight])=>score+(related(entry[key] as string|undefined,query[key])?weight:0),0);
}

function replaceHomogeneous(entries:ScriptQualityFewShot[],ranked:ScriptQualityFewShot[],key:"hookMechanism"|"proofMechanism"){
  if(entries.length<2||new Set(entries.map(item=>fold(item[key]))).size>1)return entries;
  const selected=new Set(entries.map(item=>item.id));
  const replacement=ranked.find(item=>!selected.has(item.id)&&fold(item[key])!==fold(entries[0][key]));
  return replacement?[...entries.slice(0,-1),replacement]:entries;
}

export function selectScriptQualityFewShots(query:FewShotQuery,options:FewShotSelectionOptions={}):ScriptQualityFewShot[]{
  const limit=Math.min(3,Math.max(1,options.limit??3));
  const statuses=options.statuses??["approved"];
  const ranked=scriptQualityFewShotLibrary
    .filter(item=>statuses.includes(item.status))
    .map(item=>({item,score:scoreFewShot(item,query)}))
    .filter(row=>row.score>=MIN_RELEVANCE_SCORE)
    .sort((a,b)=>b.score-a.score||a.item.id.localeCompare(b.item.id))
    .map(row=>row.item);
  let selected=ranked.slice(0,limit);
  for(let pass=0;pass<2;pass++){
    selected=replaceHomogeneous(selected,ranked,"hookMechanism");
    selected=replaceHomogeneous(selected,ranked,"proofMechanism");
  }
  return selected;
}

export function inferProductCategory(input:Pick<ScriptQualityInput,"product"|"sellingPoints">){
  const text=`${input.product} ${input.sellingPoints}`.toLowerCase();
  if(/手机|屏幕|钢化膜|耳机|充电|phone|screen|charger|headphone/.test(text))return"3C 数码";
  if(/妆|霜|膏|精华|口红|睫毛|护肤|beauty|makeup|cream|mascara|concealer/.test(text))return"美妆个护";
  if(/咖啡|零食|饮料|食品|coffee|snack|drink|food/.test(text))return"食品饮料";
  if(/健身|训练|弹力|运动|fitness|workout|gym|resistance/.test(text))return"健身运动";
  if(/收纳|清洁|家居|衣物|storage|clean|home|lint/.test(text))return"家居日用";
  return"";
}

export function buildFewShotQuery(input:ScriptQualityInput,concept:QualityCreativeConcept):FewShotQuery{
  return{market:input.country,platform:input.platform||"TikTok",productCategory:inferProductCategory(input),contentFormat:concept.contentFormat,creatorPersona:concept.creatorPersona,hookMechanism:concept.hookMechanism,primarySellingPoint:concept.primarySellingPoint,proofMechanism:concept.proofMechanism,language:input.language};
}

function grams(value:string,size=3){const text=fold(value);const out=new Set<string>();for(let i=0;i<=text.length-size;i++)out.add(text.slice(i,i+size));return out;}
function jaccard(left:string,right:string){const a=grams(left),b=grams(right);if(!a.size||!b.size)return 0;let shared=0;for(const item of a)if(b.has(item))shared++;return shared/(a.size+b.size-shared);}
function copied(left:string,right:string,threshold:number){const a=fold(left),b=fold(right);return Boolean(a&&b&&(a===b||(Math.min(a.length,b.length)>=12&&(a.includes(b)||b.includes(a)))||jaccard(left,right)>=threshold));}

export function fewShotSimilarityIssues(draft:WriterDraft,references:ScriptQualityFewShot[]):CriticIssue[]{
  const issues:CriticIssue[]=[];
  for(const reference of references){
    const fields:Array<[string,string,string,number]>=[
      ["hook",draft.hook.line,reference.example.hook.line,.78],
      ["spokenScript",draft.spokenScript,reference.example.spokenScript,.72],
      ["shot sequence",draft.shots.map(item=>item.visual).join(" "),reference.example.shots.map(item=>item.visual).join(" "),.7],
      ["CTA",draft.cta,reference.example.cta,.82],
    ];
    const matched=fields.filter(([,left,right,threshold])=>copied(left,right,threshold)).map(([field])=>field);
    if(matched.length)issues.push({type:"few_shot_similarity",severity:"high",location:matched.join(", "),problem:`与参考示例 ${reference.id} 存在明显措辞或镜头序列复用`,rewriteInstruction:"保留当前产品事实和创意目标，但重新设计措辞、Hook表达、镜头顺序与CTA；不得沿用参考示例的具体句子。"});
  }
  return issues;
}
