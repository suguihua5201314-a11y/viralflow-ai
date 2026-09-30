export function context() {
  return { productName: "CrystalArmor", profileId: null, productKnowledge: { name: "CrystalArmor", brand: "Example", category: "consumer product", sellingPoints: "对位安装器辅助安装", parameters: "", bannedWords: "永不碎", markets: "Spain", notes: "不要承诺保证结果" } };
}

export function brief(fingerprint, overrides = {}) {
  return {
    schemaVersion: 2, id: "brief-a", revisionId: "brief-revision-a", projectId: "project-a",
    opportunityReference: { canonicalOpportunityId: "opportunity-a", sourceCandidateId: "candidate-a" },
    productReference: { productName: "CrystalArmor", contextFingerprint: fingerprint }, sources: { recentScriptRevisionIds: [] },
    opportunity: { targetAudience: "通勤用户", useMoment: "地铁通勤", purchaseMotivation: "更方便地使用", tensionOrObjection: "操作过程不够顺手", creativeOpportunity: "展示一次自然使用过程" },
    direction: { contentMechanisms: ["连续观察"], creativeAngle: "从日常使用动作展示产品", creatorPersona: "通勤用户", contentFormat: "UGC 日记", spokenTone: "自然" },
    opening: { hookMechanism: "视觉问题", hookLine: "这个步骤会有什么变化？", visual: { subject: "手机", setup: "通勤座位", action: "展示操作", visibleChangeOrQuestion: "观察过程" } },
    truth: { primaryProductTruth: "对位安装器辅助安装", secondaryProductTruths: [] },
    evidence: { type: "routine-context", objective: "展示普通使用过程", visualEvidence: ["连续观察"], limitations: ["不要夸大结果"] },
    ctaDirection: "邀请用户确认适配型号", riskBoundaries: { prohibitedClaims: ["永不碎"], requiredQualifiers: ["结果取决于实际使用"], safetyConstraints: ["不要承诺保证结果"] },
    createdAt: "2026-09-30T00:00:00.000Z", ...overrides,
  };
}

export function draft(overrides = {}) {
  return {
    title: "通勤中的自然操作",
    hook: { line: "这个步骤会有什么变化？", openingVisualExecution: "同一部手机展示操作前状态。" },
    scenes: [
      { id: "hook", purpose: "hook", visual: "手机占满首帧。", action: "展示操作前状态。", dialogue: "这个步骤会有什么变化？", evidenceRole: "建立问题", briefTrace: { executesOpeningVisual: true }, durationHint: 3 },
      { id: "evidence", purpose: "evidence", visual: "连续展示对位过程。", action: "使用对位安装器完成操作。", dialogue: "对位安装器可以辅助安装。", evidenceRole: "展示支持事实", briefTrace: { executesEvidence: true }, durationHint: 8 },
      { id: "cta", purpose: "cta", visual: "包装和型号信息出现。", action: "指向适配型号。", dialogue: "可以先确认适合自己手机的型号。", evidenceRole: "行动引导", briefTrace: { executesCTA: true }, durationHint: 4 },
    ],
    fullNarration: "这个步骤会有什么变化？对位安装器可以辅助安装。可以先确认适合自己手机的型号。",
    cta: "可以先确认适合自己手机的型号。", workspaceLanguage: "zh-CN", targetLanguage: "Spanish", localizationStatus: "source", totalDurationHint: 15,
    ...overrides,
  };
}

export function makeInput(api, selection, overrides = {}) {
  const productContext = overrides.productContext || context();
  const fingerprint = selection.productContextFingerprint(productContext);
  const creativeBrief = overrides.creativeBrief || brief(fingerprint);
  const currentDraft = overrides.currentDraft || draft();
  const targetRef = overrides.targetRef || "HOOK_LINE";
  const resolvedTarget = api.resolveCriticTargetRef(currentDraft, targetRef);
  const resolved = resolvedTarget && api.resolveCriticTarget(currentDraft, resolvedTarget);
  return {
    projectId: "project-a", requestId: "rewrite-request-a", sourceScriptRevisionId: "script-revision-a",
    creativeBriefReference: { id: creativeBrief.id, revisionId: creativeBrief.revisionId }, creativeBrief,
    productContext, productContextFingerprint: fingerprint, currentDraft,
    platform: "TikTok", market: "Spain", languageContext: { workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok" },
    preferences: { variantCount: 1 },
    issues: [{ patchId: "patch-1", sourceScriptRevisionId: "script-revision-a", targetRef, resolvedTarget, expectedCurrentValue: resolved?.value || "", issueCode: "weak_hook_execution", severity: "major", message: "开头不够直接。", rewriteInstruction: "只增强开头表达。", briefField: "opening.hookLine" }],
    ...overrides,
  };
}

export const response = (value) => ({ content: typeof value === "string" ? value : JSON.stringify(value), providerRequested: "deepseek", providerUsed: "deepseek", model: "mock", responseTimeMs: 12 });
