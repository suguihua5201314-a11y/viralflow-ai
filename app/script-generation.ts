export type CreativeConcept = {
  id: string;
  creativeAngle: string;
  hookMechanism: string;
  scenario: string;
  conflict: string;
  proofMechanism: string;
  sellingPointPriority: string;
  ctaStyle: string;
};

export type StrategyPayload = {
  product: string;
  sellingPoints: string;
  audience: string;
  country: string;
  language: string;
  platform?: string;
  duration: string;
  offer: string;
  additionalRequirements?: string;
  creationMode?: string;
  hookStrategy?: string;
  framework?: string;
  creativity?: string;
};

export type StructuredScript = {
  revisionId?: string;
  title: string; hook: string; narration: string;
  product?:string;language?:string;country?:string;alternateHooks?:string[];
  creativeAngle?: string; hookType?: string; framework?: string; style?: string;
  conflict?: string; productReveal?: string; proof?: string; sellingPoints?: string;
  cta?: string; shootingSuggestion?: string; scenario?: string;
  proofMechanism?: string; ctaStyle?: string; concept?: CreativeConcept;
  providerRequested?: "deepseek"|"doubao"|"openai"; providerUsed?: "deepseek"|"doubao"|"openai"|"local";
  fallbackUsed?:boolean; providerErrorType?:string|null; responseTimeMs?:number|null; aiGenerated?:boolean;
  languageRepairAttempted?:boolean;
  scenes?: Array<{time:string;visual:string;line:string;edit:string}>;
};

type StrategyScene = { visual?:string; line?:string };

const resultMeaning = /resultado|beneficio|acabado|terminad[oa]|complet[oa]|perfect[oa]|impecable|limpi[oa]|alinead[oa]|n[ií]tid[oa]|sin\s+(?:una\s+)?(?:sola\s+)?(?:burbuja|polvo|marcas?)|cero\s+(?:burbujas?|polvo)|as[ií]\s+(?:queda|se\s+ve)|mira\s+(?:c[oó]mo\s+queda|el\s+resultado)|antes\s+y\s+despu[eé]s|final|list[oa]|ready|finished|complete|clean|clear|aligned|flawless|bubble[- ]?free|dust[- ]?free|here(?:'s| is) the result|this is the result|最终|成品|效果|完成|干净|清晰|贴正|对齐|无气泡|无灰尘|零气泡|前后对比/iu;
const processMeaning = /primero|despu[eé]s|ahora\s+(?:te\s+)?(?:muestro|enseño|explico)|c[oó]mo\s+(?:lo\s+)?(?:hice|consegu[ií])|coloc|instal|aplic|desliz|retir|paso|proceso|first|then|now\s+(?:i(?:'ll| will)\s+)?show|how\s+(?:i|we)|install|apply|place|slide|remove|step|process|接着|然后|现在看|怎么做到|如何做到|安装|放上|滑动|撕下|步骤|过程/iu;

export function followsResultFirstIntent(input:{hook?:string;scenes?:StrategyScene[]}) {
  const scenes=input.scenes ?? [];
  const opening=[input.hook,scenes[0]?.line,scenes[0]?.visual].filter(Boolean).join(" ");
  const explanation=scenes.slice(1,4).flatMap(scene=>[scene.line,scene.visual]).filter(Boolean).join(" ");
  const opensWithResult=resultMeaning.test(opening);
  const opensWithProcess=processMeaning.test(opening)&&!opensWithResult;
  const explainsAfterward=processMeaning.test(explanation)||scenes.slice(1).some(scene=>Boolean(scene.line?.trim()||scene.visual?.trim()));
  return opensWithResult&&!opensWithProcess&&explainsAfterward;
}

const curiosityMeaning = /[?？]|por qué|qu[eé]\s+(?:pasa|ocurre|es|hace)|adivina|mister|secreto|pista|why|what\s+(?:happens|is|makes)|guess|mystery|secret|为什么|怎么会|猜|到底|秘密|关键/iu;
const destructiveMeaning = /martillo|hacha|golpear|romper|destroz|hammer|axe|smash|砸碎|锤子|斧头|暴力测试/giu;

export function validateStrategyIntent(input:{
  hook?:string;
  scenes?:StrategyScene[];
  creationMode?:string;
  hookStrategy?:string;
}) {
  const scenes=input.scenes ?? [];
  const hook=[input.hook,scenes[0]?.line,scenes[0]?.visual].filter(Boolean).join(" ");
  const opening=scenes.slice(0,2).flatMap(scene=>[scene.line,scene.visual]).filter(Boolean).join(" ");
  const body=scenes.flatMap(scene=>[scene.line,scene.visual]).filter(Boolean).join(" ");
  const violations:string[]=[];
  const genericIntroduction=/^(?:hoy\s+)?(?:te\s+)?(?:presento|presentamos|voy\s+a\s+(?:presentar|hablar)|today\s+(?:i(?:'m| am)\s+)?(?:introduce|talk)|今天(?:给大家)?(?:介绍|讲)|这(?:是|款)\S*(?:产品|钢化膜))/iu.test((input.hook||scenes[0]?.line||"").trim());
  const deferredReveal=scenes.length>=2&&!genericIntroduction&&Boolean(scenes[0]?.line?.trim()||scenes[0]?.visual?.trim())&&Boolean(scenes[1]?.line?.trim()||scenes[1]?.visual?.trim());
  if(input.hookStrategy==="好奇"&&!curiosityMeaning.test(hook)&&!deferredReveal)violations.push("好奇Hook缺少信息缺口或待回答问题");
  if(input.hookStrategy==="结果前置"&&!followsResultFirstIntent({hook:input.hook,scenes}))violations.push("结果未在过程解释前出现");
  if(input.creationMode==="KOC / UGC"||input.creationMode==="产品演示"){
    const openingDestructive=(opening.match(destructiveMeaning)||[]).length;
    destructiveMeaning.lastIndex=0;
    const bodyDestructive=(body.match(destructiveMeaning)||[]).length;
    destructiveMeaning.lastIndex=0;
    // Later proof actions are allowed; only a destructive opening or a repeated destructive-test mainline breaks these modes.
    if(openingDestructive>0||bodyDestructive>=3)violations.push("创作模式被破坏测试主线覆盖");
  }
  return violations;
}

const conceptTemplates = [
  { angle:"失败救援", scenario:"真实用户第一次操作的桌面场景", conflict:"旧方法反复返工仍然失败", proof:"同机位一次完成并展示前后结果", priority:"先证明省心，再补充核心性能", cta:"像朋友给建议，不催单" },
  { angle:"质疑实测", scenario:"评论区质疑触发的现场验证", conflict:"观众不相信产品能解决输入痛点", proof:"按质疑条件完成连续无剪辑测试", priority:"先回应最大质疑，再证明其它卖点", cta:"邀请观众自己核对结果" },
  { angle:"时间挑战", scenario:"带倒计时的工作台挑战", conflict:"传统方案耗时且容易出错", proof:"计时完成关键动作并停表验收", priority:"先展示效率，再展示完成质量", cta:"给有同类痛点的人明确选择理由" },
  { angle:"生活反差", scenario:"通勤或公共场景中的真实尴尬", conflict:"日常使用暴露隐私或耐用问题", proof:"回到同一生活场景做对照复测", priority:"先解决场景痛点，再解释产品设计", cta:"用场景化提醒自然收口" },
  { angle:"视觉谜题", scenario:"近景只展示一个看不懂的动作或结果", conflict:"观众无法判断装置用途与结果来源", proof:"逐步揭晓并用特写复现完整过程", priority:"先制造理解缺口，再逐层兑现卖点", cta:"回扣开头谜题，轻量引导了解产品" },
];

const hookMechanisms:Record<string,string[]> = {
  好奇:["隐藏关键信息，制造必须看下一步的理解缺口","先展示异常细节，延迟揭晓产品用途","用未完成动作让观众猜结果","展示不可解释的结果，再倒推原因","提出具体谜题并在中段兑现"],
  冲突:["第一秒呈现失败与成功的正面对撞","让旧方法在同一条件下立即翻车","用质疑评论与现场结果直接冲突","把用户常见习惯与真实后果对撞","以明确立场挑战错误选择"],
  结果前置:["首帧展示最终结果，再解释如何做到","先给前后对比的完成画面","先亮出计时或测试结果","先展示使用后的场景收益","先给可视化证据，再回到起点"],
  反常识:["否定一个行业常见做法并马上举证","用相反动作获得更好结果","指出真正问题不在用户操作","揭示看似次要设计才是关键","用意外测试推翻默认判断"],
  问题:["提出受众能立即回答的具体痛点问题","用二选一问题迫使观众判断","询问一次常见失败经历","提出带数字条件的验证问题","从真实使用场景中的问题切入"],
  视觉钩子:["无旁白先做一个强动作","用极近景展示材料或表面变化","用计时器和手部连续动作开场","用遮挡视角或对照画面开场","用道具制造可拍摄的第一帧反差"],
};

export function buildCreativeConcepts(p:StrategyPayload, count=5):CreativeConcept[] {
  const mechanisms=hookMechanisms[p.hookStrategy || "好奇"] ?? hookMechanisms.好奇;
  return conceptTemplates.slice(0,count).map((item,index)=>({
    id:String.fromCharCode(65+index),
    creativeAngle:`${item.angle} · ${p.creationMode || "KOC / UGC"}`,
    hookMechanism:mechanisms[index % mechanisms.length],
    scenario:item.scenario,
    conflict:item.conflict,
    proofMechanism:item.proof,
    sellingPointPriority:item.priority,
    ctaStyle:item.cta,
  }));
}

const modeRules:Record<string,string> = {
  "KOC / UGC":"真人聊天感；少广告腔和参数堆砌；产品在真实情境中自然出现；CTA像个人建议。",
  "测评":"先声明测试条件；过程和结论可复核；明确优缺点；只使用输入事实。",
  "强冲突":"前3秒建立明显冲突；中段必须有证明或反转；不能开头直接讲完产品。",
  "Storytelling":"用人物目标、阻碍、转折和结果推动叙事；产品是解决过程的一部分。",
  "产品演示":"画面、动作和结果优先；文案为演示服务；每个卖点必须配可拍动作。",
};
const frameworkRules:Record<string,string> = {
  AIDA:"严格按 Attention → Interest → Desire → Action 排列信息。",
  PAS:"严格按 Problem → Agitate → Solution 排列，CTA只在解决方案证据之后。",
  对比:"建立同条件对照 → 展示差异 → 解释原因 → 给出选择建议。",
  懊悔:"先给错过或错误选择的代价 → 发现转机 → 证据 → 自然建议。",
  "问题 → 冲突 → 反转 → 证明 → CTA":"严格依次完成问题、冲突升级、认知反转、可视化证明、CTA。",
};
const creativityRules:Record<string,string> = {
  稳定:"优先成熟、清晰、低实验性的结构；事实表达直接，避免花哨设定。",
  平衡:"保持商业逻辑稳定，同时允许新Hook、新场景或新的证明方式。",
  激进:"优先非常规角度、强反差、新场景和新Hook机制，但不得改变产品事实或突破合规边界。",
};

export function buildStrategyDirectives(p:StrategyPayload, concept?:CreativeConcept) {
  const framework=p.framework || "智能随机";
  const conceptText=concept ? `\n本候选唯一创意概念：\n- Creative Angle：${concept.creativeAngle}\n- Hook Mechanism：${concept.hookMechanism}\n- Scenario：${concept.scenario}\n- Conflict / Problem：${concept.conflict}\n- Proof Mechanism：${concept.proofMechanism}\n- Selling Point Priority：${concept.sellingPointPriority}\n- CTA Style：${concept.ctaStyle}\n整条脚本必须服从该概念，不得替换成其它候选的角度或场景。` : "";
  return `创作模式：${p.creationMode || "KOC / UGC"}。规则：${modeRules[p.creationMode || "KOC / UGC"]}\nHook Strategy：${p.hookStrategy || "好奇"}。前三秒必须使用该机制，不能只换词。\nFramework：${framework}。信息顺序规则：${frameworkRules[framework] || "选择最适合Brief的成熟结构，并保持首尾一致。"}\nCreativity：${p.creativity || "平衡"}。规则：${creativityRules[p.creativity || "平衡"]}\n平台：${p.platform || "TikTok"}；视频时长：${p.duration}秒。\n补充要求：${p.additionalRequirements?.trim() || "无"}。${conceptText}`;
}

function grams(value:string) {
  const clean=value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu,"");
  const result=new Set<string>();
  if (clean.length<3) { if(clean) result.add(clean); return result; }
  for(let i=0;i<=clean.length-3;i++) result.add(clean.slice(i,i+3));
  return result;
}
export function textSimilarity(a:string,b:string) {
  const x=grams(a),y=grams(b); if(!x.size||!y.size)return 0;
  let same=0; for(const value of x)if(y.has(value))same++;
  return same/Math.max(1,Math.min(x.size,y.size));
}

export function assessDiversity(scripts:StructuredScript[]) {
  const pairs:Array<{left:number;right:number;score:number;reasons:string[]}>=[];
  for(let left=0;left<scripts.length;left++)for(let right=left+1;right<scripts.length;right++){
    const a=scripts[left],b=scripts[right];
    const dimensions = [
      ["Creative Angle",a.creativeAngle||a.title,b.creativeAngle||b.title,.72],
      ["Hook",a.hook,b.hook,.64],
      ["Hook Mechanism",a.concept?.hookMechanism||"",b.concept?.hookMechanism||"",.76],
      ["Scenario",a.scenario||a.concept?.scenario||"",b.scenario||b.concept?.scenario||"",.76],
      ["Conflict",a.conflict||"",b.conflict||"",.76],
      ["Proof Mechanism",a.proofMechanism||a.concept?.proofMechanism||"",b.proofMechanism||b.concept?.proofMechanism||"",.74],
      ["Proof",a.proof||"",b.proof||"",.68],
      ["Selling Point Priority",a.concept?.sellingPointPriority||"",b.concept?.sellingPointPriority||"",.78],
      ["CTA",a.cta||"",b.cta||"",.72],
    ] as const;
    const matches=dimensions.map(([name,aValue,bValue,threshold])=>({name,score:textSimilarity(aValue,bValue),threshold}));
    const repeated=matches.filter(item=>item.score>=item.threshold);
    const critical=matches.filter(item=>["Proof","Scenario","Creative Angle"].includes(item.name)&&item.score>=.88);
    if(repeated.length>=3||critical.length){
      const reasons=[...new Set([...repeated,...critical].map(item=>`${item.name}高度相似`))];
      const score=Math.max(...matches.map(item=>item.score));
      pairs.push({left,right,score:Number(score.toFixed(3)),reasons});
    }
  }
  const duplicateScores=new Map<number,{count:number;score:number}>();
  for(const pair of pairs)for(const index of [pair.left,pair.right]){
    const current=duplicateScores.get(index)??{count:0,score:0};
    duplicateScores.set(index,{count:current.count+1,score:current.score+pair.score});
  }
  const duplicateIndex=[...duplicateScores.entries()]
    .sort((a,b)=>b[1].count-a[1].count||b[1].score-a[1].score||b[0]-a[0])[0]?.[0]??null;
  return { passed:duplicateIndex===null, duplicateIndex, pairs };
}

export async function runDiversityRetries<T extends StructuredScript>(
  initialScripts:T[],
  regenerate:(duplicateIndex:number,attempt:number,currentScripts:T[])=>Promise<T>,
  maxAttempts=2,
) {
  const scripts=[...initialScripts];
  const regeneratedIndices:number[]=[];
  let diversity=assessDiversity(scripts);
  for(let attempt=1;attempt<=maxAttempts&&diversity.duplicateIndex!==null;attempt++){
    const duplicateIndex=diversity.duplicateIndex;
    regeneratedIndices.push(duplicateIndex);
    scripts[duplicateIndex]=await regenerate(duplicateIndex,attempt,[...scripts]);
    diversity=assessDiversity(scripts);
  }
  return {
    scripts,
    diversity:{
      ...diversity,
      regenerated:regeneratedIndices.at(-1)??null,
      regeneratedIndices,
      regenerationAttempts:regeneratedIndices.length,
    },
  };
}

export function normalizeStructuredScript<T extends StructuredScript>(script:T,p:StrategyPayload,concept?:CreativeConcept):T {
  const scenes=script.scenes || [];
  return {...script,
    creativeAngle:script.creativeAngle || concept?.creativeAngle || script.title,
    hookType:script.hookType || p.hookStrategy || "好奇",
    framework:script.framework || p.framework || "智能随机",
    conflict:script.conflict || scenes[1]?.line || "",
    productReveal:script.productReveal || scenes[2]?.line || "",
    proof:script.proof || scenes.slice(3,-2).map(item=>item.line).join(" "),
    sellingPoints:script.sellingPoints || p.sellingPoints,
    cta:script.cta || scenes.at(-1)?.line || "",
    shootingSuggestion:script.shootingSuggestion || scenes.map(item=>item.visual).filter(Boolean).slice(0,4).join("；"),
    scenario:script.scenario || concept?.scenario || "",
    proofMechanism:script.proofMechanism || concept?.proofMechanism || "",
    ctaStyle:script.ctaStyle || concept?.ctaStyle || "",
    concept:script.concept || concept,
  } as T;
}
