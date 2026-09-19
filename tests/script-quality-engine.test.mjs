import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti=createJiti(import.meta.url);
const {assessConceptDiversity,deterministicQualityIssues,preservesRequiredContent,resolveScriptEngineMode,runScriptQualityEngine}=await jiti.import("../app/script-quality/engine.ts");

const concepts=[
  {id:"A",creativeAngle:"error de alineación",hookMechanism:"pain point",hookLine:"Siempre la pongo torcida",openingVisual:"una lámina queda torcida",corePainPoint:"alineación",primarySellingPoint:"aplicador",proofMechanism:"mostrar bordes alineados",creatorPersona:"usuario torpe",contentFormat:"primera experiencia",ctaDirection:"comprobar modelo",riskNotes:[]},
  {id:"B",creativeAngle:"prueba de privacidad",hookMechanism:"visual test",hookLine:"Mira qué pasa al girarlo",openingVisual:"el móvil gira de frente a lateral",corePainPoint:"miradas laterales",primarySellingPoint:"privacidad",proofMechanism:"rotación continua",creatorPersona:"viajera",contentFormat:"demostración",ctaDirection:"uso en público",riskNotes:[]},
  {id:"C",creativeAngle:"respuesta a comentario",hookMechanism:"comment reply",hookLine:"¿De verdad quita el polvo?",openingVisual:"comentario en pantalla y mano tira de la pestaña",corePainPoint:"polvo atrapado",primarySellingPoint:"tira antipolvo",proofMechanism:"primer plano antes y después",creatorPersona:"creador de reseñas",contentFormat:"respuesta",ctaDirection:"verificar resultado",riskNotes:[]},
  {id:"D",creativeAngle:"gota cotidiana",hookMechanism:"curiosity",hookLine:"Esta gota no se queda plana",openingVisual:"una gota rueda sobre la pantalla",corePainPoint:"marcas diarias",primarySellingPoint:"superficie oleofóbica",proofMechanism:"gota y paño",creatorPersona:"persona de oficina",contentFormat:"escena diaria",ctaDirection:"uso cotidiano",riskNotes:[]},
  {id:"E",creativeAngle:"carcasa después del montaje",hookMechanism:"demonstration",hookLine:"Falta una última comprobación",openingVisual:"la mano encaja una funda",corePainPoint:"bordes que chocan",primarySellingPoint:"compatibilidad con fundas",proofMechanism:"recorrer el borde montado",creatorPersona:"fan de accesorios",contentFormat:"checklist",ctaDirection:"revisar compatibilidad",riskNotes:[]},
];
const draft={creativeDirection:"Una instalación sin pelear con la posición",hook:{line:"Mira cómo coloco el aplicador sin tocar el cristal.",visual:"La mano coloca el aplicador sobre el móvil."},spokenScript:"Mira cómo coloco el aplicador sin tocar el cristal. Presiono aquí y tiro de la pestaña. Ahora deslizo. Los bordes quedan alineados. Si vas a cambiarlo, revisa tu modelo.",shots:[
  {time:"0-3s",visual:"La mano coloca el aplicador sobre el móvil.",line:"Mira cómo coloco el aplicador sin tocar el cristal.",edit:"Corte directo."},
  {time:"3-7s",visual:"El dedo presiona y tira de la pestaña.",line:"Presiono aquí y tiro de la pestaña.",edit:"Primer plano."},
  {time:"7-12s",visual:"La mano desliza el aplicador.",line:"Ahora deslizo.",edit:"Sin corte."},
  {time:"12-22s",visual:"La cámara muestra los cuatro bordes.",line:"Los bordes quedan alineados.",edit:"Paneo corto."},
  {time:"22-27s",visual:"La mano coloca la funda.",line:"Si vas a cambiarlo, revisa tu modelo.",edit:"Plano final."},
],proof:{claim:"El aplicador ayuda a alinear",visualEvidence:"mostrar los cuatro bordes después de deslizar"},cta:"Si vas a cambiarlo, revisa tu modelo."};
const input={product:"Transformers Screen Protector",sellingPoints:"aplicador; tira antipolvo; privacidad",audience:"usuarios de móvil",country:"España",language:"西班牙语",platform:"TikTok",duration:"25",offer:"",style:"UGC",creationMode:"KOC / UGC",hookStrategy:"好奇",framework:"AIDA",knowledgePrompt:"FACT LAYER: solo hechos proporcionados",outputCount:1};
const statuses=({deepseek=true,openai=true}={})=>()=>({
  deepseek:{id:"deepseek",label:"DeepSeek",configured:deepseek,state:deepseek?"connected":"unconfigured",model:deepseek?"deepseek-v4-pro":null,baseUrl:null,missingFields:deepseek?[]:["DEEPSEEK_API_KEY"]},
  doubao:{id:"doubao",label:"豆包",configured:false,state:"unconfigured",model:null,baseUrl:null,missingFields:["ARK_API_KEY"]},
  openai:{id:"openai",label:"GPT",configured:openai,state:openai?"connected":"unconfigured",model:openai?"gpt-test":null,baseUrl:null,missingFields:openai?[]:["OPENAI_API_KEY"]},
});
const response=(value,latency=10)=>({content:JSON.stringify(value),responseTimeMs:latency,finishReason:"stop",status:200});

test("1 legacy mode remains the default and requires an explicit quality value",()=>{
  assert.equal(resolveScriptEngineMode(undefined),"legacy");
  assert.equal(resolveScriptEngineMode("legacy"),"legacy");
  assert.equal(resolveScriptEngineMode("quality"),"quality");
});

test("2/3 quality runs Creative → Writer → Critic and pass skips rewrite",async()=>{
  const calls=[];const queue=[response({concepts}),response(draft),response({pass:true,issues:[],preserve:[draft.hook.line]})];
  const result=await runScriptQualityEngine(input,{statuses:statuses(),requestId:()=>"req-pass",call:async request=>{calls.push(request);return queue.shift();}});
  assert.equal(result.status,"success");assert.equal(calls.length,3);assert.equal(result.metadata.rewriteTriggered,false);
  assert.deepEqual(calls.map(call=>call.temperature),[.9,.8,.3]);
});

test("4/5 critic fail triggers one targeted rewrite and preserves specified good content",async()=>{
  const rewritten={...draft,cta:"Si te encaja este uso, revisa tu modelo."};
  const queue=[response({concepts}),response(draft),response({pass:false,issues:[{type:"tone",severity:"medium",location:"CTA",problem:"suena comercial",rewriteInstruction:"hazlo más natural"}],preserve:[draft.hook.line]}),response(rewritten)];
  const result=await runScriptQualityEngine(input,{statuses:statuses(),requestId:()=>"req-rewrite",call:async()=>queue.shift()});
  assert.equal(result.status,"success");assert.equal(result.metadata.rewriteTriggered,true);assert.equal(result.metadata.rewrite.length,1);
  assert.equal(result.scripts[0].cta,rewritten.cta);assert.equal(result.scripts[0].hook,draft.hook.line);
  assert.equal(preservesRequiredContent(draft,rewritten,[draft.hook.line]),true);
});

test("6 DeepSeek unavailable falls back to GPT for Creative Strategist",async()=>{
  const calls=[];const queue=[response({concepts}),response(draft),response({pass:true,issues:[],preserve:[]})];
  const result=await runScriptQualityEngine(input,{statuses:statuses({deepseek:false}),call:async request=>{calls.push(request);return queue.shift();}});
  assert.equal(result.status,"success");assert.equal(calls[0].provider,"openai");assert.equal(result.metadata.creative.provider,"openai");
});

test("7/8 GPT or all keys unavailable returns structured legacy fallback without provider calls",async()=>{
  let calls=0;const result=await runScriptQualityEngine(input,{statuses:statuses({openai:false}),call:async()=>{calls++;throw new Error("must not call")}});
  assert.equal(result.status,"fallback");assert.equal(result.reason,"openai_unavailable");assert.equal(result.metadata.fallbackUsed,true);assert.equal(calls,0);
});

test("9/10 deterministic compliance catches absolute claims and fact inflation",()=>{
  for(const claim of ["100%", "completely invisible", "zero bubbles", "never breaks", "完全看不到"]){
    const unsafe={...draft,spokenScript:`${draft.spokenScript} ${claim}`};
    assert.ok(deterministicQualityIssues(unsafe).some(issue=>issue.type==="compliance"&&issue.severity==="high"),claim);
  }
});

test("11 five-concept diversity uses creative dimensions rather than text-only script similarity",async()=>{
  assert.equal(assessConceptDiversity(concepts).passed,true);
  const duplicated=concepts.map(item=>({...item}));duplicated[4]={...duplicated[4],hookMechanism:duplicated[0].hookMechanism,openingVisual:duplicated[0].openingVisual,primarySellingPoint:duplicated[0].primarySellingPoint,proofMechanism:duplicated[0].proofMechanism,creatorPersona:duplicated[0].creatorPersona,contentFormat:duplicated[0].contentFormat};
  assert.equal(assessConceptDiversity(duplicated).passed,false);
  const calls=[];const result=await runScriptQualityEngine({...input,outputCount:5},{statuses:statuses(),call:async request=>{
    calls.push(request);const system=request.messages[0].content;
    if(system.includes("创意策划"))return response({concepts});
    if(system.includes("UGC 主笔"))return response(draft);
    return response({pass:true,issues:[],preserve:[]});
  }});
  assert.equal(result.status,"success");assert.equal(result.scripts.length,5);assert.equal(calls.length,11);
});

test("12 Quality Writer internal schema maps to the existing public Script contract",async()=>{
  const queue=[response({concepts}),response(draft),response({pass:true,issues:[],preserve:[]})];
  const result=await runScriptQualityEngine(input,{statuses:statuses(),call:async()=>queue.shift()});
  assert.equal(result.status,"success");const script=result.scripts[0];
  for(const key of ["title","hook","narration","creativeAngle","hookType","framework","conflict","productReveal","proof","sellingPoints","cta","shootingSuggestion","scenes","alternateHooks"])assert.ok(key in script,key);
});

test("route gates Quality Engine behind env mode and keeps UI, schemas and database untouched",async()=>{
  const [route,provider,ui,memory]=await Promise.all(["../app/api/scripts/route.ts","../app/provider-router.ts","../app/script-studio.tsx","../app/project-memory.ts"].map(path=>readFile(new URL(path,import.meta.url),"utf8")));
  assert.match(route,/resolveScriptEngineMode/);assert.match(route,/maxDuration=180/);assert.match(route,/runScriptQualityEngine/);
  assert.match(provider,/OPENAI_API_KEY/);assert.match(provider,/OPENAI_MODEL/);assert.doesNotMatch(provider,/console\.(?:log|info).*apiKey/i);
  assert.match(memory,/PROJECT_MEMORY_VERSION = 1/);assert.doesNotMatch(ui,/SCRIPT_ENGINE_MODE|runScriptQualityEngine/);
});
