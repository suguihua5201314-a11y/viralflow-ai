import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti=createJiti(import.meta.url,{interopDefault:true});
const preflight=await jiti.import("../app/final-script-client-preflight.ts");

test("missing and malformed scriptVersions normalize to empty history",()=>{
  assert.deepEqual(preflight.normalizeRecentScriptHistory(undefined),[]);
  assert.deepEqual(preflight.normalizeRecentScriptHistory({bad:true}),[]);
  assert.deepEqual(preflight.normalizeRecentScriptHistory("bad"),[]);
});

test("valid history remains bounded to six entries",()=>{
  const history=Array.from({length:8},(_,index)=>({revisionId:`revision-${index}`}));
  assert.deepEqual(preflight.normalizeRecentScriptHistory(history).map(item=>item.revisionId),["revision-2","revision-3","revision-4","revision-5","revision-6","revision-7"]);
});

test("preflight converts missing Brief and unexpected exceptions into safe failures",()=>{
  const missing=preflight.runFinalScriptPreflight(()=>{throw new preflight.FinalScriptPreflightError("missing_current_creative_brief");});
  const unexpected=preflight.runFinalScriptPreflight(()=>{throw new Error("private product context detail");});
  assert.deepEqual(missing,{ok:false,reasonCode:"missing_current_creative_brief"});
  assert.deepEqual(unexpected,{ok:false,reasonCode:"preflight_exception"});
  assert.equal(JSON.stringify(unexpected).includes("private product context detail"),false);
});

test("happy preflight and Writer boundary execute exactly once",async()=>{
  const prepared=preflight.runFinalScriptPreflight(()=>({recentScriptHistory:preflight.normalizeRecentScriptHistory(undefined)}));
  assert.equal(prepared.ok,true);
  let calls=0;
  const response=await preflight.observedWriterFetch("client-a","/api/script-writer",{method:"POST"},async()=>{calls+=1;return new Response("{}",{status:200,headers:{"content-type":"application/json"}});});
  assert.equal(calls,1);assert.equal(response.status,200);
});

test("Writer HTTP and network failures settle without being swallowed",async()=>{
  const http=await preflight.observedWriterFetch("client-b","/api/script-writer",{},async()=>new Response("{}",{status:422}));
  assert.equal(http.status,422);
  await assert.rejects(()=>preflight.observedWriterFetch("client-c","/api/script-writer",{},async()=>{throw new Error("network down");}),/network down/);
});

test("page protects all input construction before writer loading and preserves authority flow",async()=>{
  const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
  const start=page.indexOf("async function generateFinalScript()");
  const end=page.indexOf("function saveScriptVersion",start);
  const source=page.slice(start,end);
  assert.ok(source.indexOf("runFinalScriptPreflight")<source.indexOf('setFinalScriptStatus("writer")'));
  assert.match(source,/normalizeRecentScriptHistory\(project\.assets\?\.scriptVersions\)/);
  assert.match(source,/observedWriterFetch\(clientCorrelationId,"\/api\/script-writer"/);
  assert.match(source,/script_preflight_failed/);
  assert.match(source,/invalid_product_context/);
  assert.match(page,/client_preflight.*脚本生成准备失败，请重试。/s);
  assert.match(source,/shouldReleaseFinalScriptLoading\(settledAuthority\)/);
  assert.match(source,/shouldReleaseFinalScriptLoading\(failedAuthority\)/);
  assert.doesNotMatch(source,/scriptVersions as StructuredScript\[\]\)\.slice/);
});

test("client diagnostics expose lifecycle metadata only",async()=>{
  const source=await readFile(new URL("../app/final-script-client-preflight.ts",import.meta.url),"utf8");
  for(const event of ["script_generation_clicked","script_preflight_started","script_preflight_failed","writer_fetch_started","writer_fetch_settled"])assert.match(source,new RegExp(event));
  assert.doesNotMatch(source,/creativeBrief|productContext|productKnowledge|prompt|credentials|responseBody/);
});
