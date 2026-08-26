import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

async function loadWorker(){const url=new URL("../dist/server/index.js",import.meta.url);url.searchParams.set("provider-test",`${process.pid}-${Date.now()}-${Math.random()}`);return(await import(url.href)).default;}
const runtime={waitUntil(){},passThroughOnException(){}};

test("provider status is safe and legacy requests default to doubao",async()=>{
 const worker=await loadWorker();const response=await worker.fetch(new Request("http://localhost/api/scripts"),{},runtime);assert.equal(response.status,200);const data=await response.json();
 assert.equal(data.defaultProvider,"doubao");assert.deepEqual(Object.keys(data.providers),["deepseek","doubao","openai"]);assert.equal(data.providers.openai.configured,false);
 assert.ok(!JSON.stringify(data).includes(process.env.DEEPSEEK_API_KEY||"__never__"));
});

test("GPT placeholder sends no request and returns explicit provider metadata",async()=>{
 const worker=await loadWorker();const response=await worker.fetch(new Request("http://localhost/api/scripts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({provider:"openai",product:"x",sellingPoints:"y"})}),{},runtime);assert.equal(response.status,503);const data=await response.json();assert.equal(data.provider.providerRequested,"openai");assert.equal(data.provider.aiGenerated,false);assert.equal(data.provider.fallbackUsed,false);
});

test("router isolates provider I/O while Studio keeps selector in React session",async()=>{
 const [router,route,studio,page]=await Promise.all([readFile(new URL("../app/provider-router.ts",import.meta.url),"utf8"),readFile(new URL("../app/api/scripts/route.ts",import.meta.url),"utf8"),readFile(new URL("../app/script-studio.tsx",import.meta.url),"utf8"),readFile(new URL("../app/page.tsx",import.meta.url),"utf8")]);
 for(const marker of ["ARK_API_KEY","ARK_MODEL_ID","ARK_ENDPOINT_ID","ARK_BASE_URL","unauthorized","invalid_model_or_endpoint","rate_limit","timeout"])assert.ok(router.includes(marker),marker);
 assert.ok(route.includes("callProvider"));assert.ok(route.includes("providerRequested:p.provider||DEFAULT_PROVIDER"));
 for(const marker of ["AI 模型","provider-warning","selectedProviderStatus","onProviderChange"])assert.ok(studio.includes(marker),marker);
 for(const marker of ["DeepSeek","豆包","GPT",'useState<ProviderId>("doubao")',"setLastProviderRun"])assert.ok(page.includes(marker),marker);
});

test("all text AI features share the doubao default through Provider Router",async()=>{
 const files=await Promise.all(["analyze","replicate","director","copilot","scripts"].map(name=>readFile(new URL(`../app/api/${name}/route.ts`,import.meta.url),"utf8")));
 for(const source of files)assert.ok(source.includes("callProvider"),"missing Provider Router call");
 for(const source of files)assert.equal(/provider:\s*"deepseek"|\|\|\s*"deepseek"/.test(source),false);
 for(const source of files)assert.ok(source.includes("DEFAULT_PROVIDER"));
 const knowledge=await readFile(new URL("../app/knowledge-context.ts",import.meta.url),"utf8");assert.equal(knowledge.includes("fetch("),false);assert.equal(knowledge.includes("callProvider("),false);
});

test("provider thinking override remains opt-in",async()=>{const router=await readFile(new URL("../app/provider-router.ts",import.meta.url),"utf8");assert.match(router,/thinking\?:"enabled"\|"disabled"\|"auto"/);assert.match(router,/request\.thinking\?/);const callers=await Promise.all(["analyze","replicate","copilot","scripts"].map(name=>readFile(new URL(`../app/api/${name}/route.ts`,import.meta.url),"utf8")));for(const source of callers)assert.equal(source.includes('thinking:"disabled"'),false);});
