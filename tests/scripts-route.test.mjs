import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("scripts-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}
const runtime={waitUntil(){},passThroughOnException(){}};
const base={product:"变形金刚钢化膜",sellingPoints:"10秒自动除尘安装；自动对位；无灰尘无气泡；28°防窥",audience:"经常自己贴坏钢化膜、在意隐私的手机用户",country:"Spain",language:"西班牙语",style:"真实KOC种草",platform:"TikTok",duration:"30",offer:"库存有限，买一份到手两张膜",additionalRequirements:"真人口语，避免夸张承诺"};

async function generate(worker,payload){
  const response=await worker.fetch(new Request("http://localhost/api/scripts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...base,...payload})}),{},runtime);
  assert.equal(response.status,201);
  return response.json();
}

test("strategy controls produce materially different structured scripts",async()=>{
  const worker=await loadWorker();
  const a=await generate(worker,{creationMode:"KOC / UGC",hookStrategy:"好奇",framework:"PAS",creativity:"稳定",outputCount:1,nonce:101});
  const b=await generate(worker,{creationMode:"强冲突",hookStrategy:"冲突",framework:"问题 → 冲突 → 反转 → 证明 → CTA",creativity:"激进",outputCount:1,nonce:202});
  const c=await generate(worker,{creationMode:"产品演示",hookStrategy:"结果前置",framework:"AIDA",creativity:"平衡",outputCount:1,nonce:303});
  assert.deepEqual([a.script.hookType,b.script.hookType,c.script.hookType],["好奇","冲突","结果前置"]);
  assert.deepEqual([a.script.framework,b.script.framework,c.script.framework],["PAS","问题 → 冲突 → 反转 → 证明 → CTA","AIDA"]);
  assert.equal(new Set([a.script.hook,b.script.hook,c.script.hook]).size,3);
  for(const result of [a,b,c]) for(const field of ["creativeAngle","conflict","productReveal","proof","sellingPoints","cta","shootingSuggestion"]) assert.equal(typeof result.script[field],"string");
});

test("five-version race is concept-first and reports repeated fallback proof",async()=>{
  const worker=await loadWorker();
  const result=await generate(worker,{creationMode:"KOC / UGC",hookStrategy:"好奇",framework:"PAS",creativity:"平衡",outputCount:5,nonce:404});
  assert.equal(result.scripts.length,5); assert.equal(result.concepts.length,5);
  assert.equal(new Set(result.concepts.map(item=>item.creativeAngle)).size,5);
  assert.equal(new Set(result.scripts.map(item=>item.hook)).size,5);
  assert.equal(new Set(result.scripts.map(item=>item.scenario)).size,5);
  assert.equal(new Set(result.scripts.map(item=>item.proofMechanism)).size,5);
  assert.equal(new Set(result.scripts.map(item=>item.cta)).size,5);
  assert.equal(result.diversity.passed,false);
  assert.notEqual(result.diversity.regenerated,null);
  assert.ok(result.diversity.pairs.some(pair=>pair.reasons.includes("Proof高度相似")));
});

test("diversity guard rejects repeated proof even when hooks and concepts differ",async()=>{
  const {assessDiversity}=await import(`../app/script-generation.ts?diversity=${Date.now()}`);
  const scripts=Array.from({length:3},(_,index)=>({
    title:`版本${index}`,creativeAngle:["失败救援","时间挑战","生活反差"][index],hook:["为什么会这样？","十秒会怎样？","地铁里发生了什么？"][index],narration:"",
    scenario:["桌面","计时工作台","地铁"][index],conflict:["贴膜失败","速度太慢","隐私暴露"][index],proofMechanism:["前后对比","停表验收","侧面复测"][index],cta:["看看型号","查看优惠","确认版本"][index],
    proof:"放上保护膜，滑动安装器，撕下薄膜，展示无灰尘无气泡的最终结果。",
    concept:{id:String.fromCharCode(65+index),creativeAngle:["失败救援","时间挑战","生活反差"][index],hookMechanism:["隐藏信息","倒计时","场景反差"][index],scenario:["桌面","计时工作台","地铁"][index],conflict:["贴膜失败","速度太慢","隐私暴露"][index],proofMechanism:["前后对比","停表验收","侧面复测"][index],sellingPointPriority:["省心优先","效率优先","隐私优先"][index],ctaStyle:["朋友建议","明确选择","场景提醒"][index]},
  }));
  const result=assessDiversity(scripts);
  assert.equal(result.passed,false);
  assert.notEqual(result.duplicateIndex,null);
  assert.ok(result.pairs.some(pair=>pair.reasons.includes("Proof高度相似")));
});

test("result-first validation accepts semantic result openings and rejects process-first openings",async()=>{
  const {followsResultFirstIntent,validateStrategyIntent}=await import(`../app/script-generation.ts?strategy=${Date.now()}`);
  assert.equal(followsResultFirstIntent({
    hook:"Mira esta pantalla impecable y perfectamente alineada.",
    scenes:[
      {visual:"Primer plano del acabado limpio",line:"Mira esta pantalla impecable y perfectamente alineada."},
      {visual:"Se coloca el aplicador",line:"Ahora te enseño cómo lo hice."},
    ],
  }),true);
  assert.equal(followsResultFirstIntent({
    hook:"Primero coloca el protector sobre la pantalla.",
    scenes:[
      {visual:"Manos iniciando la instalación",line:"Primero coloca el protector sobre la pantalla."},
      {visual:"Resultado final",line:"Así queda limpio y alineado."},
    ],
  }),false);
  assert.deepEqual(validateStrategyIntent({creationMode:"产品演示",hookStrategy:"好奇",hook:"Hay una pista en esta esquina.",scenes:[{line:"Hay una pista en esta esquina.",visual:"成品特写"},{line:"Ahora muestro el proceso.",visual:"刀片只在后段证明抗刮"}]}),[]);
  assert.deepEqual(validateStrategyIntent({creationMode:"KOC / UGC",hookStrategy:"好奇",hook:"Esta esquina parecía un fallo.",scenes:[{line:"Esta esquina parecía un fallo.",visual:"只展示异常边角"},{line:"La respuesta aparece al deslizar.",visual:"第二镜头才揭示动作"}]}),[]);
  assert.ok(validateStrategyIntent({creationMode:"产品演示",hookStrategy:"好奇",hook:"Presentamos el producto.",scenes:[{line:"Golpear con un martillo.",visual:"锤子砸碎竞品"}]}).length>=2);
});

test("knowledge context keeps facts, reference, compliance and bounded memory separated",async()=>{
  const {buildKnowledgeContext,findFactViolations,renderKnowledgeContext}=await import(`../app/knowledge-context.ts?knowledge=${Date.now()}`);
  const context=buildKnowledgeContext({
    ...base,
    productKnowledge:{name:base.product,brand:"Transformers",category:"钢化膜",sellingPoints:"10秒自动除尘安装；28°防窥；抗刮耐磨；电镀疏水疏油层",parameters:"左右28°防窥；一盒两片膜",bannedWords:"100%防爆；永不碎",markets:"西班牙、意大利",audience:base.audience,offer:base.offer,notes:"危险测试需在受控环境进行"},
    sellingPointKnowledge:[{product:base.product,points:"自动对位；无灰尘无气泡"}],
    referenceScript:"为什么普通钢化膜总有气泡？先展示失败，再连续安装，最后用同机位展示干净结果并自然提醒查看型号。",
    recent:Array.from({length:10},(_,index)=>({title:`历史${index}`,hook:`这是历史使用过的旧Hook ${index}`,narration:"旧正文",creativeAngle:`角度${index}`,scenario:`场景${index}`,proofMechanism:`证明${index}`,cta:`CTA ${index}`,product:base.product,language:base.language})),
    creativeConcept:{id:"D",creativeAngle:"生活反差",hookMechanism:"场景反差",scenario:"公共场合",conflict:"隐私暴露",proofMechanism:"侧面复测",sellingPointPriority:"隐私优先",ctaStyle:"场景提醒"},
  });
  assert.equal(context.metadata.productKnowledgeUsed,true);
  assert.equal(context.metadata.viralReferenceUsed,true);
  assert.equal(context.metadata.historyMemoryCount,6);
  assert.equal(context.sellingPointPriority.primary,"电镀疏水疏油层");
  assert.match(renderKnowledgeContext(context),/FACT LAYER \/ KNOWN FACTS/);
  assert.deepEqual(findFactViolations("它拥有99%认证保护。",context),["使用了未提供的参数:99%"]);
  assert.ok(findFactViolations("100%防爆，永不碎。",context).length>=2);
  assert.ok(findFactViolations(context.viralReference.sourceExcerpt,context).includes("直接复制了爆款参考表达"));
  assert.ok(findFactViolations("这是历史使用过的旧Hook 0，后面继续介绍产品。",context).includes("复用了近期历史Hook"));
  const spanishReference=buildKnowledgeContext({...base,referenceScript:"¿Por qué siempre queda una burbuja justo en el centro? Después muestra el fallo, la instalación y el resultado."});
  assert.ok(findFactViolations("¿Por qué siempre me queda una burbuja justo en el centro?\nAhora cambio el proceso.",spanishReference).includes("直接复制了爆款参考表达"));
  assert.ok(findFactViolations("¿A ti también te sale siempre una burbuja en el centro?\nDespués enseño una instalación nueva.",spanishReference).includes("直接复制了爆款参考表达"));
  assert.equal(findFactViolations("¿Por qué este detalle cambia el resultado?\nPrimero enseño el fallo y después una prueba nueva.",spanishReference).includes("直接复制了爆款参考表达"),false);
});

test("diversity guard retries only the highest duplicate candidate at most twice",async()=>{
  const {runDiversityRetries}=await import(`../app/script-generation.ts?retry=${Date.now()}`);
  const duplicate=(id)=>({title:`重复${id}`,creativeAngle:"失败救援",hook:"为什么总有气泡？",narration:"",scenario:"桌面",conflict:"贴膜失败",proofMechanism:"同机位前后对比",proof:"滑动安装器后展示无尘无泡结果",cta:"查看适配型号"});
  const calls=[];
  const failed=await runDiversityRetries([duplicate("A"),duplicate("B"),duplicate("C")],async(index,attempt)=>{calls.push({index,attempt});return duplicate(`R${attempt}`)},2);
  assert.deepEqual(calls.map(item=>item.attempt),[1,2]);
  assert.equal(failed.diversity.regenerationAttempts,2);
  assert.equal(failed.diversity.passed,false);
  assert.equal(failed.diversity.regeneratedIndices.length,2);
  assert.ok(calls.every(item=>Number.isInteger(item.index)));
});

test("knowledge engine assigns distinct selling-point priorities to five concepts",async()=>{
  const {buildKnowledgeContext}=await import(`../app/knowledge-context.ts?priority=${Date.now()}`);
  const {buildCreativeConcepts}=await import(`../app/script-generation.ts?concepts=${Date.now()}`);
  const profile={name:base.product,sellingPoints:"10秒自动除尘安装；28°防窥；抗刮耐磨；电镀疏水疏油层；一盒两片膜",parameters:"左右28°防窥",bannedWords:"永不碎",markets:"西班牙",audience:base.audience,offer:base.offer};
  const concepts=buildCreativeConcepts(base,5);
  const priorities=concepts.map(creativeConcept=>buildKnowledgeContext({...base,productKnowledge:profile,creativeConcept}).sellingPointPriority.primary);
  assert.equal(new Set(priorities).size,5);
});

test("scripts API returns safe knowledge metadata without requiring a knowledge profile",async()=>{
  const worker=await loadWorker();
  const withoutKnowledge=await generate(worker,{outputCount:1,nonce:505});
  assert.equal(withoutKnowledge.knowledge.productKnowledgeUsed,false);
  assert.equal(withoutKnowledge.knowledge.complianceKnowledgeUsed,true);
  const withKnowledge=await generate(worker,{
    outputCount:5,nonce:606,
    productKnowledge:{name:base.product,sellingPoints:"10秒自动除尘安装；28°防窥；抗刮耐磨；电镀疏水疏油层；一盒两片膜",parameters:"左右28°防窥",bannedWords:"100%防爆；永不碎",markets:"西班牙",audience:base.audience,offer:base.offer},
    sellingPointKnowledge:[{product:base.product,points:"自动对位；无灰尘无气泡"}],
  });
  assert.equal(withKnowledge.knowledge.productKnowledgeUsed,true);
  assert.equal(withKnowledge.sellingPointPriorities.length,5);
  assert.equal(new Set(withKnowledge.sellingPointPriorities.map(item=>item.primary)).size,5);
  assert.equal("apiKey" in withKnowledge.knowledge,false);
});

test("provider retry guidance is present without exposing reference or credentials",async()=>{
  const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../app/api/scripts/route.ts",import.meta.url),"utf8"));
  assert.match(source,/必须更换Hook的核心词、主语、具体问题和首帧画面/);
  assert.doesNotMatch(source,/Bearer\s+[A-Za-z0-9_-]{20,}/);
});
