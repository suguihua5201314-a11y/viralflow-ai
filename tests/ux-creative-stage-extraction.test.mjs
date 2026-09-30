import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL(path, import.meta.url), "utf8");
const page = read("../app/page.tsx");
const stage = read("../app/components/creative/creative-stage.tsx");
const directions = read("../app/components/script/creative-direction-workspace.tsx");
const studio = read("../app/script-studio.tsx");
const memory = read("../app/project-memory.ts");

test("ProductionStage creative renders an independent Creative stage", () => {
  assert.match(page, /productionStage === "creative" \? <CreativeStage/);
  assert.match(stage, /data-production-stage="creative"/);
  assert.match(stage, /这条商品视频准备从什么方向拍/);
  assert.doesNotMatch(stage, /ScriptStudio/);
});

test("normal Creative flow supports three focused Direction cards without internal metadata", () => {
  assert.match(directions, /session\.directions\.map/);
  assert.match(directions, /Creative Angle|item\.creativeAngle/);
  assert.match(directions, /item\.hookLine/);
  assert.match(directions, /开场画面/);
  assert.match(directions, /使用时刻/);
  assert.match(directions, /为什么值得拍/);
  assert.doesNotMatch(directions, /revisionId|fingerprint|Provider|repair count/);
});

test("selection keeps the canonical Brief path and requires a valid Brief before Script handoff", () => {
  assert.match(page, /onSelect=\{opportunityId=>selectCreativeDirection\(opportunityId,creativeStageControls\)\}/);
  assert.match(page, /fetch\("\/api\/creative-brief"/);
  assert.match(directions, /currentBrief &&/);
  assert.match(directions, /onContinueToScript/);
  assert.match(page, /onContinueToScript=\{\(\)=>navigateProductionStage\("script"\)\}/);
});

test("Brief and diagnostics are collapsed while user errors remain safe", () => {
  assert.match(directions, /<details className="creative-brief-details">/);
  assert.match(directions, /<summary>查看创意依据<\/summary>/);
  assert.match(directions, /<summary>技术详情<\/summary>/);
  assert.match(directions, /创意方案没有成功生成，我们已经保留你选择的方向/);
  assert.doesNotMatch(directions, /role="alert"><p>\{session\.briefError/);
});

test("V1-V5 race is absent from the default path and remains in an explicit legacy disclosure", () => {
  assert.match(studio, /legacyRaceOpen && <section className="os-script-version-rail"/);
  assert.match(studio, /legacyRaceOpen && <details className="creative-race-details"/);
  assert.match(studio, /更多生成方式/);
  assert.doesNotMatch(stage, /raceResults|onGenerateRace|>V[1-5]</);
});

test("Script stage shows only the selected creative summary and can return without changing identity", () => {
  assert.match(studio, /className="script-current-creative"/);
  assert.match(studio, /currentCreativeBrief\?\.direction\.creativeAngle/);
  assert.match(studio, /返回修改创意/);
  assert.match(page, /onReturnToCreative=\{\(\)=>navigateProductionStage\("creative"\)\}/);
  assert.doesNotMatch(studio, /<CreativeDirectionWorkspace/);
});

test("Product Context and canonical persistence are reused without a duplicate UX-2 store", () => {
  assert.match(page, /creativeProductContext=currentProductContext/);
  assert.match(page, /currentCreativeBrief/);
  assert.match(memory, /creativeBriefRevisions/);
  assert.doesNotMatch(memory, /creativeStageComplete|selectedCreativeStage|ux2/);
});

test("stage intent restores from navigation while downstream availability follows Brief lineage", () => {
  assert.match(page, /window\.location\.hash\.match\(\/\^#stage=/);
  assert.match(page, /window\.history\.replaceState/);
  assert.match(page, /result\.sourceCreativeBriefRevisionId===currentCreativeBrief\.revisionId/);
  assert.doesNotMatch(memory, /productionStage|requestedProductionStage/);
});
