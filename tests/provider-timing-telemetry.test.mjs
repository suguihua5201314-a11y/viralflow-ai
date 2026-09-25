import test from "node:test";
import assert from "node:assert/strict";
import { createJiti } from "jiti";

const jiti=createJiti(import.meta.url,{moduleCache:false,interopDefault:true});
const router=await jiti.import("../app/provider-router.ts");
const originalFetch=globalThis.fetch;
const originalLog=console.log;
const originalKey=process.env.DEEPSEEK_API_KEY;

function request(timeoutMs=30){return{provider:"deepseek",purpose:"creative-brain",candidateCount:5,messages:[{role:"system",content:"safe system"},{role:"user",content:"safe user"}],temperature:.88,topP:.9,maxTokens:5200,timeoutMs};}
function capture(){const entries=[];console.log=(value)=>{try{const parsed=JSON.parse(String(value));if(parsed.scope==="provider_timing")entries.push(parsed);}catch{}};return entries;}
function abortError(){return new DOMException("The operation was aborted","AbortError");}
function waitForAbort(signal){return new Promise((_,reject)=>{if(signal.aborted)return reject(abortError());const keepAlive=setTimeout(()=>{},100);signal.addEventListener("abort",()=>{clearTimeout(keepAlive);reject(abortError());},{once:true});});}
function response(body,{status=200,contentType="application/json"}={}){return new Response(body,{status,headers:{"content-type":contentType}});}

test.beforeEach(()=>{process.env.DEEPSEEK_API_KEY="telemetry-test-key";});
test.afterEach(()=>{globalThis.fetch=originalFetch;console.log=originalLog;});
test.after(()=>{if(originalKey===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=originalKey;});

test("waiting_for_headers timeout emits safe timing telemetry and preserves timeout semantics",async()=>{
 const entries=capture();globalThis.fetch=async(_url,init)=>waitForAbort(init.signal);
 await assert.rejects(router.callProvider(request(5)),error=>error instanceof router.ProviderCallError&&error.category==="timeout");
 const failure=entries.find(entry=>entry.event==="provider_failure");
 assert.equal(failure.stage,"waiting_for_headers");assert.equal(failure.headersReceived,false);assert.equal(failure.httpStatus,null);
 assert.equal(entries.filter(entry=>entry.event==="fetch_started").length,1);
 assert.equal(entries[0].purpose,"creative-brain");assert.equal(entries[0].candidateCount,5);
});

test("waiting_for_body timeout records received headers without changing timeout classification",async()=>{
 const entries=capture();
 globalThis.fetch=async(_url,init)=>({ok:true,status:200,headers:new Headers({"content-type":"application/json"}),text:()=>waitForAbort(init.signal)});
 await assert.rejects(router.callProvider(request(5)),error=>error instanceof router.ProviderCallError&&error.category==="timeout"&&error.status===200);
 const failure=entries.find(entry=>entry.event==="provider_failure");
 assert.equal(failure.stage,"waiting_for_body");assert.equal(failure.headersReceived,true);assert.equal(failure.httpStatus,200);
 assert.ok(entries.some(entry=>entry.event==="headers_received"));
});

test("successful provider call emits header, body and total timing telemetry",async()=>{
 const entries=capture();globalThis.fetch=async()=>response(JSON.stringify({choices:[{message:{content:'{"opportunities":[]}'},finish_reason:"stop"}]}));
 const result=await router.callProvider(request());
 assert.equal(result.status,200);assert.equal(result.content,'{"opportunities":[]}');
 for(const event of ["request_started","fetch_started","headers_received","body_completed","provider_success"])assert.ok(entries.some(entry=>entry.event===event),event);
 const success=entries.find(entry=>entry.event==="provider_success");assert.equal(success.stage,"completed");assert.equal(success.httpStatus,200);assert.ok(success.totalElapsedMs>=0);
});

test("HTTP errors retain classification and emit response_http telemetry",async()=>{
 const entries=capture();globalThis.fetch=async()=>response("denied",{status:429,contentType:"text/plain"});
 await assert.rejects(router.callProvider(request()),error=>error instanceof router.ProviderCallError&&error.category==="rate_limit"&&error.status===429);
 const failure=entries.find(entry=>entry.event==="provider_failure");assert.equal(failure.stage,"response_http");assert.equal(failure.httpStatus,429);
 assert.ok(entries.some(entry=>entry.event==="body_completed"));
});

test("telemetry never exposes credentials, authorization, prompts or response bodies",async()=>{
 const entries=capture();globalThis.fetch=async()=>response(JSON.stringify({choices:[{message:{content:"sensitive-response-body"}}]}));
 await router.callProvider({...request(),messages:[{role:"system",content:"secret-prompt-value"},{role:"user",content:"private-product-context"}]});
 const serialized=JSON.stringify(entries);
 for(const forbidden of ["telemetry-test-key","authorization","Bearer","secret-prompt-value","private-product-context","sensitive-response-body"])assert.equal(serialized.includes(forbidden),false,forbidden);
 assert.ok(entries[0].inputChars>0);assert.ok(entries[0].approxInputTokens>0);
});
