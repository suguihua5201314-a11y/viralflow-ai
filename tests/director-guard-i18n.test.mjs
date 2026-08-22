import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import test from "node:test";

test("30 秒采用脚本是 Director 时长的唯一权威来源",async()=>{
  const page=await readFile(new URL("../app/page.tsx",import.meta.url),"utf8");
  const payload=page.slice(page.indexOf("const directorInput"),page.indexOf("return <AppShell"));
  assert.match(payload,/targetDuration:adoptedDirectorContext\.duration/);
  assert.doesNotMatch(payload,/targetDuration:Number\(form\.duration\)/);
  assert.match(page,/adoptCurrentScript\(data\.script,\{duration:Number\(form\.duration\)\|\|30,offer:form\.offer\}\)/);
  assert.match(page,/setAdoptedDirectorContext\(\{duration:Number\(setup\.duration\)\|\|30,offer:""\}\)/);
});

test("商业事实保护覆盖价格、组合促销、库存、赠品、配送和保修",async()=>{
  const {buildKnowledgeContext,findFactViolations}=await import(`../app/knowledge-context.ts?guard=${Date.now()}`);
  const context=buildKnowledgeContext({product:"屏幕保护膜",sellingPoints:"自动安装；防窥",audience:"手机用户",country:"Spain",language:"西班牙语",platform:"TikTok",offer:"",productKnowledge:{name:"屏幕保护膜",sellingPoints:"自动安装；防窥"}});
  for(const claim of ["Ahora 2×1.","Quedan pocas unidades.","Cupón del 50%.","Envío gratis mañana.","Garantía de por vida.","Solo €19."]){
    assert.ok(findFactViolations(claim,context).length>0,claim);
  }
  assert.equal(findFactViolations("Si instalarlo siempre te cuesta, mira esta forma de hacerlo.",context).length,0);
  assert.equal(findFactViolations("Ahora 2×1.",context,"La promoción actual es 2×1.").length,0);
});

test("Director 全字段与单镜候选共用 Context、Fact、Language Guard",async()=>{
  const [core,route]=await Promise.all([readFile(new URL("../app/director-core.ts",import.meta.url),"utf8"),readFile(new URL("../app/api/director/route.ts",import.meta.url),"utf8")]);
  for(const field of ["ctaExecution","talentAction","dialogue","voiceover","editingNotes","continuityNotes"])assert.ok(core.includes(field),field);
  assert.match(route,/const facts=directorFactViolations/);
  assert.match(route,/validateScriptLanguage/);
  assert.match(route,/该镜头包含未经产品资料支持的信息，已拒绝/);
  assert.match(route,/status:422/);
});

test("导演工作台显示层中文化且 AI 修复必须预览后接受",async()=>{
  const ui=await readFile(new URL("../app/shooting-director.tsx",import.meta.url),"utf8");
  for(const marker of ["导演方案","镜头编辑器","镜头时间轴","目标时长","计划时长","完整性检查","AI 建议补充产品出场镜头","AI 建议补充证明镜头","自动平衡时长","修改前","修改后","接受","拒绝"])assert.ok(ui.includes(marker),marker);
  assert.match(ui,/mode:"replace"\|"insert"/);
  assert.match(ui,/if\(preview\.mode==="insert"\)/);
  assert.match(ui,/setPreview\(\{mode:"insert"/);
});
