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
