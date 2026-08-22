import assert from "node:assert/strict";
import test from "node:test";

const spanish={
 title:"Instalación limpia en diez segundos",hook:"¿Por qué siempre queda una burbuja en el centro?",
 alternateHooks:["Hay un paso que cambia por completo el resultado."],narration:"Primero aparece el problema. Después muestro una instalación limpia.",
 conflict:"El método anterior deja polvo y burbujas.",productReveal:"Uso el protector de pantalla Transformers.",
 proof:"Lo instalo en diez segundos y enseño el resultado sin burbujas.",sellingPoints:"Alineación automática y eliminación de polvo.",
 cta:"Comprueba el modelo compatible.",shootingSuggestion:"Mostrar el resultado en primer plano.",scenes:[{line:"¿Por qué siempre queda una burbuja?"},{line:"Mira cómo desaparece el polvo."}],
};

test("Language Guard accepts consistent Spanish and English fixtures",async()=>{
 const {validateScriptLanguage}=await import(`../app/language-guard.ts?ok=${Date.now()}`);
 assert.equal(validateScriptLanguage(spanish,"西班牙语").passed,true);
 assert.equal(validateScriptLanguage({...spanish,title:"Clean installation in ten seconds",hook:"Why does one bubble always stay in the middle?",alternateHooks:["One small step changes the whole result."],narration:"First I show the problem. Then I show a clean installation.",conflict:"The old method leaves dust and bubbles.",productReveal:"I use the Transformers screen protector.",proof:"I install it in ten seconds and show the bubble-free result.",sellingPoints:"Automatic alignment and dust removal.",cta:"Check the compatible model.",shootingSuggestion:"Show the result in a close-up.",scenes:[{line:"Why does one bubble always stay?"},{line:"Watch the dust disappear."}]},"English").passed,true);
});

test("Language Guard rejects mixed Chinese blocks in a Spanish provider fixture",async()=>{
 const {validateScriptLanguage}=await import(`../app/language-guard.ts?mixed=${Date.now()}`);
 const result=validateScriptLanguage({...spanish,conflict:"手残党贴膜反复失败：气泡、灰尘、贴歪",proof:"10秒自动除尘安装，展示无气泡结果",cta:"现在检查你的手机型号"},"Spanish");
 assert.equal(result.passed,false);
 assert.match(result.reasons.join(" "),/han_script/);
 assert.deepEqual(result.offendingFields.filter(field=>["conflict","proof","cta"].includes(field)),["conflict","proof","cta"]);
});

test("scripts route performs one targeted language repair before fallback",async()=>{
 const source=await import("node:fs/promises").then(fs=>fs.readFile(new URL("../app/api/scripts/route.ts",import.meta.url),"utf8"));
 assert.match(source,/language_validation_error/);
 assert.match(source,/保持完全相同的 Product Facts、Creative Concept、Hook机制、Framework/);
 assert.match(source,/classified\.category==="language_validation_error"/);
});
