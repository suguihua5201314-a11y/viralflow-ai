import type { CreativeConcept } from "./script-generation";

export type ProductKnowledge = {
  id?:number; name?:string; brand?:string; category?:string; sellingPoints?:string;
  parameters?:string; bannedWords?:string; markets?:string; audience?:string;
  price?:string; offer?:string; notes?:string; updatedAt?:string;
};
export type SellingPointKnowledge = { product?:string; points?:string };
export type MemoryScript = {
  title:string; hook:string; narration?:string; creativeAngle?:string;
  scenario?:string; proofMechanism?:string; cta?:string; product?:string; language?:string;
};
export type SellingPointPriority = { primary:string; secondary:string[]; optional:string[] };
export type KnowledgeMetadata = {
  productKnowledgeUsed:boolean; viralReferenceUsed:boolean; historyMemoryUsed:boolean;
  complianceKnowledgeUsed:boolean; sellingPointCount:number; historyMemoryCount:number;
  productFieldCount:number;
};
export type GenerationComplianceKnowledge = { highRiskExpressions:string[]; platformConstraints:string[] };
export type KnowledgeContext = {
  facts:Record<string,string>;
  sellingPoints:string[];
  sellingPointPriority:SellingPointPriority;
  compliance:{ bannedExpressions:string[]; enforcedBannedExpressions:string[]; platformConstraints:string[] };
  market:{ country:string; language:string; platform:string };
  viralReference:null|ReturnType<typeof analyzeViralReference>;
  recentMemory:MemoryScript[];
  metadata:KnowledgeMetadata;
};

type KnowledgeInput = {
  product:string; sellingPoints:string; audience:string; country:string; language:string;
  platform?:string; offer:string; productKnowledge?:ProductKnowledge;
  sellingPointKnowledge?:SellingPointKnowledge[]; referenceScript?:string;
  recent?:MemoryScript[]; creativeConcept?:CreativeConcept; complianceKnowledge?:GenerationComplianceKnowledge;
};

const splitItems=(value?:string)=>String(value||"").split(/[；;\n]+/).map(item=>item.trim()).filter(Boolean);
const clip=(value:string,max:number)=>value.length>max?`${value.slice(0,max)}…`:value;
const normalize=(value:string)=>value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu,"");
function unique(items:string[]) {
  const seen=new Set<string>();
  return items.filter(item=>{const key=normalize(item);if(!key||seen.has(key))return false;seen.add(key);return true;});
}
function sameProduct(a?:string,b?:string){const x=normalize(a||""),y=normalize(b||"");return Boolean(x&&y&&(x===y||x.includes(y)||y.includes(x)));}

const pointThemes:Array<RegExp>=[
  /安装|对位|除尘|气泡|贴歪|秒|install|align|dust|bubble|segund|instal|aline|polvo|burbuja/i,
  /防窥|隐私|角度|privacy|privacidad|ángulo|angle/i,
  /抗刮|耐磨|抗冲击|刮|撞|scratch|impact|ray|golpe|resisten/i,
  /疏水|疏油|指纹|水|油|hydro|oleo|fingerprint|agua|huella/i,
  /兼容|手机壳|包装|两片|工具|compatible|case|funda|pack|herramienta/i,
];

export function prioritizeSellingPoints(points:string[],concept?:CreativeConcept):SellingPointPriority {
  const available=unique(points);
  if(!available.length)return {primary:"",secondary:[],optional:[]};
  const requested=concept?.sellingPointPriority?.split(/[→；;\n]+/).map(item=>item.trim()).filter(Boolean)??[];
  const requestedPrimary=requested.map(item=>available.find(point=>{const a=normalize(point),b=normalize(item);return a===b||a.includes(b)||b.includes(a)})).find(Boolean);
  const conceptIndex=Math.max(0,(concept?.id?.charCodeAt(0)??65)-65);
  const theme=pointThemes[conceptIndex%pointThemes.length];
  const themed=available.filter(point=>theme.test(point));
  const primary=requestedPrimary??themed[0]??available[conceptIndex%available.length];
  const remaining=available.filter(point=>point!==primary);
  const offset=remaining.length?conceptIndex%remaining.length:0;
  const rotated=[...remaining.slice(offset),...remaining.slice(0,offset)];
  return {primary,secondary:rotated.slice(0,2),optional:rotated.slice(2)};
}

export function analyzeViralReference(reference:string) {
  const labeled=(label:string)=>reference.match(new RegExp(`^${label}:\\s*(.+)$`,`mi`))?.[1]?.trim();
  const lines=reference.replace(/\r/g,"").split(/(?<=[。！？!?；;])|\n+/).map(line=>line.trim()).filter(Boolean);
  const sourceTranscript=reference.split("[Source Transcript]")[1]?.trim();
  const first=(sourceTranscript||lines[0]||"").split(/(?<=[。！？!?])|\n/)[0]||"";
  const hookMechanism=/[?？]|por qué|why|猜|adivina/i.test(first)?"提问/理解缺口":/对比|versus|contra|浪费|失败|别买|no compres/i.test(first)?"冲突/对照":/结果|秒|完成|final|resultado|segund/i.test(first)?"结果前置":"场景/新奇信息";
  const indexOf=(pattern:RegExp)=>lines.findIndex(line=>pattern.test(line));
  const conflict=indexOf(/失败|普通|问题|浪费|fail|problema|normal|dinero/i);
  const proof=indexOf(/测试|结果|安装|对比|test|prueba|resultado|instal/i);
  const cta=indexOf(/买|下单|库存|优惠|buy|compra|stock|oferta/i);
  return {
    hookMechanism:labeled("Hook Mechanism")||hookMechanism,
    creativeAngle:labeled("Creative Angle")||(conflict>=0?"痛点或对照推动":"场景或结果推动"),
    pacing:labeled("Pacing")||(lines.length>=8?"短句快节奏":lines.length>=4?"中快节奏":"精简结构"),
    informationOrder:labeled("Information Order")||["Hook",conflict>=0?"Conflict":null,proof>=0?"Proof":null,cta>=0?"CTA":null].filter(Boolean).join(" → "),
    conflictMechanism:labeled("Conflict")||(conflict>=0?clip(lines[conflict],120):"未明显使用冲突"),
    proofMechanism:labeled("Proof")||(proof>=0?clip(lines[proof],120):"未明显提供证明"),
    ctaStyle:labeled("CTA Style")||(cta>=0?clip(lines[cta],120):"自然收口"),
    sourceExcerpt:clip(sourceTranscript||reference,2400),
  };
}

export function buildKnowledgeContext(input:KnowledgeInput):KnowledgeContext {
  const profile=input.productKnowledge&&sameProduct(input.product,input.productKnowledge.name)?input.productKnowledge:undefined;
  const matchingPointKnowledge=(input.sellingPointKnowledge||[]).filter(item=>sameProduct(input.product,item.product));
  const points=unique([
    ...splitItems(input.sellingPoints),
    ...splitItems(profile?.sellingPoints),
    ...matchingPointKnowledge.flatMap(item=>splitItems(item.points)),
  ]);
  const facts=Object.fromEntries(Object.entries({
    productName:profile?.name||input.product, brand:profile?.brand||"", category:profile?.category||"",
    parameters:profile?.parameters||"", audience:profile?.audience||input.audience,
    markets:profile?.markets||input.country, price:profile?.price||"", offer:profile?.offer||input.offer,
    notes:profile?.notes||"",
  }).filter(([,value])=>Boolean(value?.trim())).map(([key,value])=>[key,clip(value,1200)]));
  const compliance=input.complianceKnowledge??{
    highRiskExpressions:[],
    platformConstraints:["避免绝对化承诺、虚假认证、无法证明的测试结论和不真实促销","危险演示必须说明受控条件并避免鼓励模仿"],
  };
  const enforcedBannedExpressions=unique(splitItems(profile?.bannedWords));
  const bannedExpressions=unique([...enforcedBannedExpressions,...compliance.highRiskExpressions]);
  const recentMemory=(input.recent||[])
    .filter(item=>(!item.product||sameProduct(input.product,item.product))&&(!item.language||item.language===input.language))
    .slice(0,6)
    .map(item=>({...item,title:clip(item.title,120),hook:clip(item.hook,180),narration:clip(item.narration||"",320),creativeAngle:clip(item.creativeAngle||"",120),scenario:clip(item.scenario||"",120),proofMechanism:clip(item.proofMechanism||"",120),cta:clip(item.cta||"",160)}));
  const viralReference=input.referenceScript?.trim()?analyzeViralReference(input.referenceScript.trim()):null;
  const productFields=profile?Object.entries(profile).filter(([key,value])=>!['id','updatedAt'].includes(key)&&Boolean(String(value||'').trim())).length:0;
  return {
    facts,
    sellingPoints:points,
    sellingPointPriority:prioritizeSellingPoints(points,input.creativeConcept),
    compliance:{bannedExpressions,enforcedBannedExpressions,platformConstraints:compliance.platformConstraints},
    market:{country:input.country,language:input.language,platform:input.platform||"TikTok"},
    viralReference,
    recentMemory,
    metadata:{
      productKnowledgeUsed:Boolean(profile),viralReferenceUsed:Boolean(viralReference),historyMemoryUsed:recentMemory.length>0,
      complianceKnowledgeUsed:true,sellingPointCount:points.length,historyMemoryCount:recentMemory.length,productFieldCount:productFields,
    },
  };
}

export function renderKnowledgeContext(context:KnowledgeContext) {
  const priority=context.sellingPointPriority;
  const facts=Object.entries(context.facts).map(([key,value])=>`- ${key}: ${value}`).join("\n")||"- 仅使用当前 Brief 中的信息";
  const memory=context.recentMemory.map((item,index)=>`${index+1}. Hook=${item.hook}｜Angle=${item.creativeAngle||"未记录"}｜Scenario=${item.scenario||"未记录"}｜Proof=${item.proofMechanism||"未记录"}｜CTA=${item.cta||"未记录"}`).join("\n")||"无";
  const reference=context.viralReference?JSON.stringify({...context.viralReference,sourceExcerpt:context.viralReference.sourceExcerpt}):"无";
  return `KNOWLEDGE CONTEXT\n\n[FACT LAYER / KNOWN FACTS]\n${facts}\n- Allowed selling points: ${context.sellingPoints.join("；")||"仅使用Brief"}\n- 事实层是唯一产品事实来源；没有写出的参数、认证、材质、测试、价格、折扣、赠品或能力一律不得补充。\n\n[SELLING POINT PRIORITY]\n- Primary: ${priority.primary||"按Brief主卖点"}\n- Secondary: ${priority.secondary.join("；")||"无"}\n- Optional (只有剧情需要才使用): ${priority.optional.join("；")||"无"}\n- 本条只围绕1个主卖点和最多2个辅助卖点，不得把全部卖点逐项念完。\n\n[COMPLIANCE CONSTRAINTS]\n- 禁用表达: ${context.compliance.bannedExpressions.join("；")||"无产品专属禁用词"}\n- 平台约束: ${context.compliance.platformConstraints.join("；")}\n\n[MARKET CONTEXT]\n- ${context.market.country} / ${context.market.language} / ${context.market.platform}\n\n[REFERENCE LAYER]\n${reference}\n- 只学习机制、节奏和信息顺序，禁止复制原句；参考中的产品事实不得迁移。\n\n[HISTORY MEMORY / AVOID REPETITION]\n${memory}\n- 历史只用于避开Hook、开头句式、Creative Angle、Scenario、Proof Mechanism和CTA，不得强制模仿。`;
}

export function findFactViolations(text:string,context:KnowledgeContext) {
  const normalized=text.toLowerCase();
  const violations:string[]=[];
  for(const expression of context.compliance.enforcedBannedExpressions)if(expression.length>=3&&normalized.includes(expression.toLowerCase()))violations.push(`命中产品禁用表达:${expression}`);
  const factText=Object.values(context.facts).join(" ")+" "+context.sellingPoints.join(" ");
  const offerProvided=Boolean(context.facts.offer?.trim());
  if(!offerProvided&&/(?:quedan\s+poc[oa]s|[uú]ltimas?\s+unidades?|stock\s+limitado|limited\s+stock|only\s+\d+\s+left|库存有限|仅剩|最后\d+件|regalo|gratis|free\s+gift|赠送|赠品|descuento|rebaja|discount|\d+%\s+off|折扣|优惠|买\S*送)/iu.test(text))violations.push("使用了未提供的促销、赠品或库存信息");
  if(!context.facts.price?.trim()&&/(?:[$€£]\s*\d|\d+(?:[.,]\d+)?\s*[$€£]|por\s+solo\s+\d|only\s+[$€£]?\d|仅需\s*\d|只要\s*\d)/iu.test(text))violations.push("使用了未提供的价格信息");
  if(/platform certified|officially approved|doctor recommended|国家认证|平台认证|官方指定|aprobado oficialmente|recomendado por médicos/i.test(text)&&!/认证|certif|aprobado|recommended/i.test(factText))violations.push("使用了未提供的认证或背书");
  const claims=[...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(%|°|mm|cm|mah|w)/gi)].map(match=>`${match[1]}${match[2].toLowerCase()}`);
  const normalizedFacts=normalize(factText);
  for(const claim of claims)if(!normalizedFacts.includes(normalize(claim)))violations.push(`使用了未提供的参数:${claim}`);
  const wordWindows=(value:string)=>{
    const words=value.toLowerCase().match(/[a-záéíóúüñ0-9]+/gi)||[];
    return words.length>=8?Array.from({length:words.length-7},(_,index)=>words.slice(index,index+8).join(" ")):[];
  };
  if(context.viralReference){
    const source=context.viralReference.sourceExcerpt;
    const copiedWords=wordWindows(source).some(window=>text.toLowerCase().includes(window));
    const tokens=(value:string)=>value.toLowerCase().match(/[a-záéíóúüñ0-9]+/gi)||[];
    const sourceHook=source.split(/(?<=[.!?？。！])|\n/)[0]||source;
    const targetHook=text.split(/\n|(?<=[.!?？。！])/)[0]||text;
    const sourceHookTokens=tokens(sourceHook),targetHookTokens=tokens(targetHook);
    const bigrams=(items:string[])=>new Set(items.slice(0,-1).map((word,index)=>`${word} ${items[index+1]}`));
    const sourceBigrams=bigrams(sourceHookTokens),targetBigrams=bigrams(targetHookTokens);
    let sharedBigrams=0;for(const pair of sourceBigrams)if(targetBigrams.has(pair))sharedBigrams++;
    const orderedSimilarity=(2*sharedBigrams)/Math.max(1,sourceBigrams.size+targetBigrams.size);
    const lengthRatio=Math.min(sourceHookTokens.length,targetHookTokens.length)/Math.max(1,Math.max(sourceHookTokens.length,targetHookTokens.length));
    const stopWords=new Set(["a","al","de","del","el","en","es","la","las","lo","los","me","mi","por","que","qué","se","si","su","te","tu","un","una","y","the","a","an","is","it","in","on","of","to","you","your","why","what","this","that"]);
    const contentTokens=(items:string[])=>items.filter(word=>!stopWords.has(word));
    const sourceContent=contentTokens(sourceHookTokens),targetContent=contentTokens(targetHookTokens);
    const targetContentSet=new Set(targetContent);
    const sharedContent=[...new Set(sourceContent)].filter(word=>targetContentSet.has(word)).length;
    const contentOverlap=sharedContent/Math.max(1,Math.min(new Set(sourceContent).size,new Set(targetContent).size));
    const copiedHook=Math.min(sourceHookTokens.length,targetHookTokens.length)>=7&&lengthRatio>=.72&&(orderedSimilarity>=.68||(Math.min(sourceContent.length,targetContent.length)>=4&&sharedContent>=3&&contentOverlap>=.5));
    const sourceCompact=normalize(source),targetCompact=normalize(text);
    const copiedChars=/[\u3400-\u9fff]/u.test(source)&&sourceCompact.length>=24&&Array.from({length:sourceCompact.length-23},(_,index)=>sourceCompact.slice(index,index+24)).some(window=>targetCompact.includes(window));
    if(copiedWords||copiedHook||copiedChars)violations.push("直接复制了爆款参考表达");
  }
  for(const memory of context.recentMemory){
    const oldHook=normalize(memory.hook);
    if(oldHook.length>=10&&normalize(text).includes(oldHook)){violations.push("复用了近期历史Hook");break;}
  }
  return unique(violations);
}
