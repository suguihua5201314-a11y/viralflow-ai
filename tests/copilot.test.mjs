import assert from "node:assert/strict";
import test from "node:test";

async function loadWorker(){const url=new URL("../dist/server/index.js",import.meta.url);url.searchParams.set("copilot-test",`${process.pid}-${Date.now()}-${Math.random()}`);return(await import(url.href)).default;}
const runtime={waitUntil(){},passThroughOnException(){}};
const blocks=[
  {key:"hook",label:"HOOK",type:"前 3 秒",text:"Esto parece un anuncio, pero espera a ver esta esquina."},
  {key:"conflict",label:"冲突 / 问题",type:"观看理由",text:"Siempre me quedaban polvo, burbujas o el protector torcido."},
  {key:"product",label:"产品出现",type:"产品入场",text:"Entonces probé este protector Transformers con aplicador."},
  {key:"proof",label:"演示 / 证明",type:"动作证明",text:"Lo coloqué, deslicé la herramienta y quedó alineado sin polvo ni burbujas."},
  {key:"points",label:"卖点递进",type:"价值建立",text:"La instalación tarda 10 segundos y también ofrece privacidad de 28°."},
  {key:"cta",label:"CTA",type:"行动引导",text:"Comprueba tu modelo y la oferta disponible en la página."},
];
const payload={mode:"single",targetKey:"hook",action:"更自然",blocks,lockedKeys:[],script:{title:"Test",hookType:"好奇",framework:"PAS",style:"KOC / UGC"},product:"变形金刚钢化膜",sellingPoints:"10秒自动除尘安装；自动对位；无灰尘无气泡；28°防窥",audience:"经常自己贴坏钢化膜、在意隐私的手机用户",country:"西班牙",language:"西班牙语",offer:"买一份到手两张膜",platform:"TikTok",creationMode:"KOC / UGC",hookStrategy:"好奇",framework:"PAS",creativity:"稳定",productKnowledge:{name:"变形金刚钢化膜",sellingPoints:"10秒自动除尘安装；自动对位；无灰尘无气泡；28°防窥",parameters:"左右28°防窥",bannedWords:"100%防爆；永不碎",markets:"西班牙",offer:"买一份到手两张膜"}};

async function post(worker,body){return worker.fetch(new Request("http://localhost/api/copilot",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)}),{},runtime);}

test("A/B hook rewrite stays Spanish and only returns the target block",async()=>{
  process.env.COPILOT_TEST_MODE="1";process.env.COPILOT_TEST_RESPONSE=JSON.stringify({blocks:[{key:"hook",text:"Te juro que pensé que era otro anuncio… hasta que vi lo que pasó en esta esquina."}]});const worker=await loadWorker();
  try{const response=await post(worker,{...payload,instruction:"这个太像广告，改成普通女生聊天的感觉，但保留悬念。"});assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.candidate.keys,["hook"]);assert.equal(data.candidate.blocks.length,1);assert.match(data.candidate.blocks[0].text,/pensé|hasta que/i);assert.doesNotMatch(data.candidate.blocks[0].text,/[\u3400-\u9fff]/u);assert.equal(data.guards.fact,true);assert.equal(data.knowledge.productKnowledgeUsed,true);}finally{delete process.env.COPILOT_TEST_MODE;delete process.env.COPILOT_TEST_RESPONSE;}
});

test("C rewrite unlocked treats hook and conflict locks as hard constraints",async()=>{
  const changed=blocks.filter(block=>!["hook","conflict"].includes(block.key)).map(block=>({...block,text:`${block.text} Ahora se entiende mejor.`}));process.env.COPILOT_TEST_MODE="1";process.env.COPILOT_TEST_RESPONSE=JSON.stringify({blocks:changed});const worker=await loadWorker();
  try{const response=await post(worker,{...payload,mode:"unlocked",targetKey:undefined,lockedKeys:["hook","conflict"]});assert.equal(response.status,200);const data=await response.json();assert.deepEqual(data.candidate.keys,["product","proof","points","cta"]);assert.ok(data.candidate.blocks.every(block=>!["hook","conflict"].includes(block.key)));}finally{delete process.env.COPILOT_TEST_MODE;delete process.env.COPILOT_TEST_RESPONSE;}
});

test("D fact and compliance guard rejects invented parameter, certification and absolute claim",async()=>{
  const unsafe=[{key:"proof",text:"Tiene certificación oficial, protección 99% garantizada y nunca se rompe."}];process.env.COPILOT_TEST_MODE="1";process.env.COPILOT_TEST_RESPONSE=JSON.stringify({blocks:unsafe});const worker=await loadWorker();
  try{const response=await post(worker,{...payload,targetKey:"proof",action:"加强 Proof / 证明"});assert.equal(response.status,422);const data=await response.json();assert.ok(data.details.some(item=>/99%|认证|高风险/.test(item)));}finally{delete process.env.COPILOT_TEST_MODE;delete process.env.COPILOT_TEST_RESPONSE;}
});

test("E/F/G source preserves preview accept undo versions and existing studio capabilities",async()=>{
  const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../app/script-studio.tsx",import.meta.url),"utf8"));
  for(const marker of ["BEFORE","AFTER","放弃，不修改","接受并替换","undoLastRewrite","saveVersion","V${versions.length+1}","onGenerateRace","adoptRace","compareOpen","checkCompliance","scoreScript"])assert.ok(source.includes(marker),`missing ${marker}`);
  assert.doesNotMatch(source,/key=\{(?:resultIdentity|scriptIdentity|creationMode|hookStrategy)/);
});
