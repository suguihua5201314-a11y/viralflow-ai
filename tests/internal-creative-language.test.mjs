import assert from "node:assert/strict";
import test from "node:test";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const directions = await jiti.import("../app/creative-directions.ts");
const briefRuntime = await jiti.import("../app/creative-brief-expansion.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");
const contract = await jiti.import("../app/creative-contract.ts");

const languageContext = { workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok" };
const productContext = { productName: "晶盾", profileId: 7, productKnowledge: { id: 7, name: "晶盾", category: "手机配件", sellingPoints: "辅助对位；日常防窥", parameters: "", bannedWords: "绝对防摔", notes: "不要承诺绝对效果" } };
const brainInput = { projectId: "project-a", productContext, languageContext, market: "Spain", language: "Spanish", platform: "TikTok", recentCreativeHistory: [] };

const chineseDirection = (id, angle = "通勤视角切换") => ({
  id, targetAudience: "通勤用户", useMoment: "乘坐地铁时", coreMotivation: "减少旁人看到屏幕内容的顾虑",
  coreTension: "公共座位距离很近", creativeAngle: angle, contentMechanism: "正面与侧面视角切换",
  hookLine: "旁边座位到底能看到多少？", openingVisual: { subject: "手机屏幕", setup: "地铁座位", action: "镜头从正面移动到侧面", visibleChangeOrQuestion: "屏幕可见范围发生变化" },
  rationale: "用日常视角变化把使用情境讲清楚",
});
const diverseChineseDirections = [
  chineseDirection("A"),
  {
    id: "B", targetAudience: "经常贴膜失败的用户", useMoment: "准备安装新膜时", coreMotivation: "减少对位返工",
    coreTension: "边缘稍有偏差就要重新调整", creativeAngle: "安装过程拆解", contentMechanism: "分步骤动作演示",
    hookLine: "从哪里开始对准更省事？", openingVisual: { subject: "手机与保护膜", setup: "整洁桌面", action: "手指先固定一侧再缓慢放下", visibleChangeOrQuestion: "对位过程是否顺畅" },
    rationale: "用可执行步骤回应安装时的真实顾虑",
  },
  {
    id: "C", targetAudience: "重视屏幕日常整洁的用户", useMoment: "午后擦拭屏幕时", coreMotivation: "保持清晰观感",
    coreTension: "频繁触碰后屏幕容易留下痕迹", creativeAngle: "一天使用后的观察", contentMechanism: "时间切片对照记录",
    hookLine: "用了半天，屏幕现在是什么状态？", openingVisual: { subject: "使用中的手机屏幕", setup: "窗边自然光", action: "倾斜屏幕观察表面", visibleChangeOrQuestion: "光线下是否看见明显痕迹" },
    rationale: "通过日常观察呈现用户在意的使用体验",
  },
];
const englishDirection = (id) => ({ id, targetAudience: "commuters", useMoment: "on a train", coreMotivation: "reduce casual side viewing", coreTension: "nearby seats", creativeAngle: "switch the point of view", contentMechanism: "front-to-side camera move", hookLine: "What can the next seat see?", openingVisual: { subject: "phone", setup: "train seat", action: "move from front to side", visibleChangeOrQuestion: "the visible area changes" }, rationale: "make the moment tangible" });
const directionPayload = (items) => JSON.stringify({ directions: items });
const providerResponse = (content) => ({ content, providerRequested: "deepseek", providerUsed: "deepseek", model: "mock", responseTimeMs: 1 });

const canonicalDirection = selection.canonicalizeCreativeDirection(chineseDirection("A"), "creative-opportunity-a");
const fingerprint = selection.productContextFingerprint(productContext);
const briefInput = { projectId: "project-a", selectedDirection: canonicalDirection, productContext, productContextFingerprint: fingerprint, languageContext, market: "Spain", language: "Spanish", platform: "TikTok" };
const chineseExpansion = { hookMechanism: "视觉提问", evidenceStrategy: { type: "routine-context", objective: "展示日常观看角度", visualEvidence: ["镜头从正面移动到侧面"], limitations: ["不要暗示完全不可见"] }, ctaDirection: "邀请用户确认适配型号", riskBoundaries: { prohibitedClaims: ["不要声称绝对防摔"], requiredQualifiers: ["效果会随观看角度变化"], safetyConstraints: ["使用日常安全场景"] }, creatorPersona: "通勤用户", contentFormat: "观察式记录", spokenTone: "自然好奇" };
const englishExpansion = { hookMechanism: "visual question", evidenceStrategy: { type: "routine-context", objective: "show the ordinary viewing angle", visualEvidence: ["move from front to side"], limitations: ["do not imply total privacy"] }, ctaDirection: "invite viewers to check compatibility", riskBoundaries: { prohibitedClaims: ["do not claim absolute protection"], requiredQualifiers: ["results vary by angle"], safetyConstraints: ["use an ordinary safe setting"] }, creatorPersona: "commuter", contentFormat: "observational diary", spokenTone: "curious" };

test("Spain/Spanish and US/English targets both keep internal Directions in Chinese", () => {
  for (const context of [languageContext, { ...languageContext, targetLanguage: "English", market: "US" }]) {
    const input = { ...brainInput, languageContext: context, market: context.market, language: context.targetLanguage };
    assert.deepEqual(directions.validateCreativeDirection(chineseDirection("A"), input).filter((item) => item.type === "language"), []);
    assert.ok(directions.validateCreativeDirection(englishDirection("A"), input).some((item) => item.type === "language"));
    const prompt = directions.creativeDirectionMessages(input)[0].content;
    assert.match(prompt, /Simplified Chinese/);
    assert.match(prompt, /future-localization constraints/);
  }
});

test("target language and market remain independent audience context without changing output language", () => {
  const context = directions.buildCreativeDirectionContext({ ...brainInput, languageContext: { ...languageContext, targetLanguage: "French", market: "Canada" } });
  assert.equal(context.workspaceLanguage, "zh-CN");
  assert.deepEqual(context.audienceContext, { market: "Canada", targetLanguage: "French", platform: "TikTok" });
  assert.match(context.languageInstruction, /Simplified Chinese/);
});

test("wrong-language Directions receive one constrained semantic-preserving repair", async () => {
  let calls = 0;
  const result = await directions.generateCreativeDirections(brainInput, async (request) => {
    calls += 1;
    if (calls === 2) {
      assert.match(request.messages[0].content, /Re-express these wrong-language directions in Simplified Chinese/);
      assert.match(request.messages[0].content, /without changing their IDs/);
    }
    return providerResponse(calls === 1
      ? directionPayload([englishDirection("A"), englishDirection("B"), englishDirection("C")])
      : directionPayload(diverseChineseDirections));
  });
  assert.equal(calls, 2);
  assert.equal(result.status, "success");
  assert.deepEqual(result.directions.map((item) => item.id), ["A", "B", "C"]);
});

test("new Brief persists languageContext while Product fingerprint and lineage remain unchanged", () => {
  const brief = briefRuntime.buildCreativeBrief(briefInput, chineseExpansion, "2026-09-28T00:00:00.000Z");
  assert.deepEqual(brief.languageContext, languageContext);
  assert.equal(brief.productReference.contextFingerprint, fingerprint);
  assert.equal(brief.opportunityReference.canonicalOpportunityId, canonicalDirection.id);
  assert.equal(selection.productContextFingerprint({ ...productContext }), fingerprint);
  assert.deepEqual(JSON.parse(JSON.stringify(brief)).languageContext, languageContext);
});

test("legacy Brief resolves language context without mutation or revision creation", () => {
  const legacyBrief = briefRuntime.buildCreativeBrief({ ...briefInput, languageContext: undefined }, englishExpansion);
  delete legacyBrief.languageContext;
  const snapshot = JSON.stringify(legacyBrief);
  const resolved = contract.resolveCreativeBriefLanguageContext(legacyBrief, { language: "Spanish", market: "Spain", platform: "TikTok" });
  assert.deepEqual(resolved, languageContext);
  assert.equal(JSON.stringify(legacyBrief), snapshot);
});

test("Brief internal strategy validates Chinese and repairs wrong language at most once", async () => {
  assert.deepEqual(briefRuntime.validateCreativeBriefExpansion(chineseExpansion, briefInput).filter((item) => item.stage === "internal_language"), []);
  assert.ok(briefRuntime.validateCreativeBriefExpansion(englishExpansion, briefInput).some((item) => item.stage === "internal_language"));
  let calls = 0;
  const result = await briefRuntime.generateCreativeBrief(briefInput, async (request) => {
    calls += 1;
    if (calls === 2) {
      const payload = JSON.parse(request.messages[1].content);
      assert.deepEqual(payload.repairExpansion, englishExpansion);
      assert.match(payload.repairInstruction, /preserve meaning and structure/i);
    }
    return providerResponse(JSON.stringify({ expansion: calls === 1 ? englishExpansion : chineseExpansion }));
  });
  assert.equal(calls, 2);
  assert.equal(result.status, "success");
  assert.deepEqual(result.brief.languageContext, languageContext);
});

test("five categories share the same Chinese internal runtime without category language mappings", () => {
  for (const [index, name] of ["钢化膜", "益生菌牙膏", "睫毛膏", "保湿棒", "电动牙刷"].entries()) {
    const input = { ...brainInput, productContext: { ...productContext, productName: name, profileId: index + 20 } };
    assert.deepEqual(directions.validateCreativeDirection(chineseDirection(String(index)), input).filter((item) => item.type === "language"), []);
  }
});
