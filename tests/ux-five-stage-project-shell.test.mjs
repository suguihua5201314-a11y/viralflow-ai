import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createJiti } from "jiti";

const jiti=createJiti(import.meta.url,{interopDefault:true});
const stages=await jiti.import("../app/production-stage.ts");
const page=fs.readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
const memory=fs.readFileSync(new URL("../app/project-memory.ts",import.meta.url),"utf8");
const sidebar=fs.readFileSync(new URL("../app/components/layout/sidebar.tsx",import.meta.url),"utf8");
const workflow=fs.readFileSync(new URL("../app/components/layout/workflow-step-bar.tsx",import.meta.url),"utf8");
const project=fs.readFileSync(new URL("../app/project-workspace.tsx",import.meta.url),"utf8");

const assets=(patch={})=>({productContextCoherent:false,hasSelectedCreativeBrief:false,hasCurrentScriptRevision:false,hasCurrentDirectorContext:false,hasCurrentImageAssets:false,...patch});

test("five stages have one canonical order and one current state",()=>{
  assert.deepEqual(stages.PRODUCTION_STAGES,["product","creative","script","director","images"]);
  assert.deepEqual(stages.PRODUCTION_STAGES.map(x=>stages.PRODUCTION_STAGE_META[x].label),["商品","创意","脚本","导演","图片"]);
  const values=Object.values(stages.productionStageStatuses("creative",assets({productContextCoherent:true})));
  assert.equal(values.filter(value=>value==="current").length,1);
});

test("availability and completion derive only from canonical asset facts",()=>{
  assert.equal(stages.productionStageStatuses("product",assets()).creative,"locked");
  assert.equal(stages.productionStageStatuses("creative",assets({productContextCoherent:true})).creative,"current");
  assert.equal(stages.productionStageStatuses("creative",assets({productContextCoherent:true,hasSelectedCreativeBrief:true})).script,"available");
  assert.equal(stages.productionStageStatuses("script",assets({productContextCoherent:true,hasSelectedCreativeBrief:true,hasCurrentScriptRevision:true})).director,"available");
  assert.equal(stages.productionStageStatuses("director",assets({productContextCoherent:true,hasSelectedCreativeBrief:true,hasCurrentScriptRevision:true,hasCurrentDirectorContext:true})).images,"available");
});

test("stale upstream assets invalidate downstream access",()=>{
  const stale=assets({productContextCoherent:true,hasSelectedCreativeBrief:true,hasCurrentScriptRevision:false,hasCurrentDirectorContext:false,hasCurrentImageAssets:true});
  const statuses=stages.productionStageStatuses("script",stale);
  assert.equal(statuses.director,"locked");
  assert.equal(statuses.images,"locked");
  assert.equal(stages.resolveProductionStage("director",stale),"script");
});

test("ActiveView compatibility and refresh mapping preserve real stage intent",()=>{
  const complete=assets({productContextCoherent:true,hasSelectedCreativeBrief:true,hasCurrentScriptRevision:true,hasCurrentDirectorContext:true});
  assert.equal(stages.stageForActiveView("brain",complete),"product");
  assert.equal(stages.stageForActiveView("create",complete),"script");
  assert.equal(stages.stageForActiveView("director",complete),"director");
  assert.equal(stages.stageForActiveView("frames",complete),"images");
  assert.equal(stages.stageForActiveView("breakdown",complete),null);
});

test("previous completed stages remain enabled and no completion is persisted",()=>{
  const statuses=stages.productionStageStatuses("director",assets({productContextCoherent:true,hasSelectedCreativeBrief:true,hasCurrentScriptRevision:true}));
  assert.equal(statuses.product,"completed");
  assert.equal(statuses.creative,"completed");
  assert.equal(statuses.script,"completed");
  assert.doesNotMatch(memory,/productComplete|creativeComplete|scriptComplete|directorComplete|imagesComplete/);
});

test("shell, project flow and sidebar expose the simplified hierarchy",()=>{
  assert.match(workflow,/PRODUCTION_STAGES\.map/);
  assert.match(project,/PRODUCTION_STAGES\.map/);
  assert.match(sidebar,/>工具</);
  assert.match(sidebar,/toolItems\.map/);
  assert.doesNotMatch(sidebar,/帮助中心|设置页面即将开放/);
  assert.match(page,/productionStage=\{productionStage === "creative"/);
  assert.match(page,/saveWorkspaceSnapshot\(\{activeView:view\}\)/);
});

