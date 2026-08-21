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

test("five-version race is concept-first and passes diversity guard",async()=>{
  const worker=await loadWorker();
  const result=await generate(worker,{creationMode:"KOC / UGC",hookStrategy:"好奇",framework:"PAS",creativity:"平衡",outputCount:5,nonce:404});
  assert.equal(result.scripts.length,5); assert.equal(result.concepts.length,5);
  assert.equal(new Set(result.concepts.map(item=>item.creativeAngle)).size,5);
  assert.equal(new Set(result.scripts.map(item=>item.hook)).size,5);
  assert.equal(new Set(result.scripts.map(item=>item.scenario)).size,5);
  assert.equal(new Set(result.scripts.map(item=>item.proofMechanism)).size,5);
  assert.equal(new Set(result.scripts.map(item=>item.cta)).size,5);
  assert.equal(result.diversity.passed,true);
});
