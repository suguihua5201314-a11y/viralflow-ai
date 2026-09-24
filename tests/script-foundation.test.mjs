import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const read=path=>readFile(new URL(`../${path}`,import.meta.url),"utf8");
async function loadCommonJs(path){
  const source=await read(path);
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const module={exports:{}};
  new Function("module","exports",output)(module,module.exports);
  return module.exports;
}

test("A/B canonical script revision identity survives persistence and legacy identity remains readable",async()=>{
  const {ensureScriptRevision,scriptRevisionIdentity}=await loadCommonJs("app/script-foundation.ts");
  const revised=ensureScriptRevision({title:"V1",product:"产品",narration:"文案"});
  assert.match(revised.revisionId,/^script-revision-/);
  assert.equal(scriptRevisionIdentity(JSON.parse(JSON.stringify(revised))),revised.revisionId);
  assert.equal(scriptRevisionIdentity({id:42,title:"旧稿"}),"legacy-script:42");
  assert.match(scriptRevisionIdentity({title:"旧稿",product:"旧产品",narration:"旧文案"}),/^legacy-copy:/);
});

test("C-F block edits synchronise canonical scenes so stale scene lines cannot win",async()=>{
  const {synchronizeScriptScenes}=await loadCommonJs("app/script-foundation.ts");
  const blocks=[
    ["hook","新 Hook"],["conflict","新 Conflict"],["product","新 Reveal"],
    ["proof","新 Proof"],["points","新 Selling Points"],["cta","新 CTA"],
  ].map(([key,text],index)=>({key,duration:`${index}-${index+1}s`,text}));
  const old=blocks.map((_,index)=>({time:`${index}-${index+1}s`,visual:`画面${index}`,line:`旧文案${index}`,edit:"Cut"}));
  const scenes=synchronizeScriptScenes(old,blocks);
  assert.deepEqual(scenes.map(scene=>scene.line),blocks.map(block=>block.text));
  assert.equal(scenes[0].line,"新 Hook");
  assert.equal(scenes[3].line,"新 Proof");
  assert.equal(scenes[5].line,"新 CTA");
  assert.equal(scenes.some(scene=>scene.line.startsWith("旧文案")),false);
});

test("K canonical product binding survives a manual product-name edit",async()=>{
  const {resolveCanonicalProductContext}=await loadCommonJs("app/product-context.ts");
  const profile={id:7,name:"原产品",brand:"Brand",category:"配件",sellingPoints:"卖点",parameters:"参数",bannedWords:"禁用词",price:"19",offer:"优惠"};
  const context=resolveCanonicalProductContext({productName:"用户改名",selectedProductId:7,profiles:[profile]});
  assert.equal(context.productName,"用户改名");
  assert.equal(context.profileId,7);
  assert.equal(context.productKnowledge.name,"用户改名");
  assert.equal(context.productKnowledge.parameters,"参数");
  assert.equal(context.productKnowledge.bannedWords,"禁用词");
});

test("G/H/I Director binding and Frame identity use project plus revision without replacing the director context chain",async()=>{
  const [page,core,route,director,frame]=await Promise.all([
    read("app/page.tsx"),read("app/director-core.ts"),read("app/api/director/route.ts"),read("app/shooting-director.tsx"),read("app/frame-prompt-workspace.tsx"),
  ]);
  assert.match(page,/projectId:currentDirectorProject\?\.id,scriptRevisionId:scriptRevisionIdentity\(result\)/);
  assert.match(core,/projectId:request\.projectId\|\|"legacy-project"/);
  assert.match(core,/scriptRevisionId:request\.scriptRevisionId\|\|"legacy-revision"/);
  assert.match(route,/sourceScriptRevisionId:body\.scriptRevisionId/);
  assert.match(director,/result\.metadata\.sourceScriptRevisionId/);
  assert.match(frame,/requestRevisionId \?\? requestScriptId \?\? scriptId/);
  assert.match(frame,/`director:\$\{directorContextId\}`/);
});

test("J old Project memory remains compatible because all foundation fields are optional",async()=>{
  const [memory,workspace]=await Promise.all([read("app/project-memory.ts"),read("app/script-workspace.ts")]);
  assert.match(memory,/productProfileId\?: number/);
  assert.match(workspace,/scriptRevisionIdentity\(script\)/);
  assert.match(workspace,/workspaceScript\|\|versions\.at\(-1\)\|\|replicationScript\|\|null/);
});
