import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const api = await jiti.import("../app/brief-driven-script.ts");
const selection = await jiti.import("../app/creative-opportunity-selection.ts");

const productContext = {
  productName: "CrystalArmor",
  profileId: 7,
  productKnowledge: {
    id: 7,
    name: "CrystalArmor",
    category: "phone accessory",
    sellingPoints: "28° viewing angle; alignment applicator",
    parameters: "28° viewing angle",
    bannedWords: "unbreakable; doctor recommended",
    notes: "Do not promise guaranteed results or 100% protection",
  },
};

const fingerprint = selection.productContextFingerprint(productContext);

function brief(overrides = {}) {
  const value = {
    schemaVersion: 2,
    id: "creative-brief-a",
    revisionId: "creative-brief-revision-a",
    projectId: "project-a",
    opportunityReference: { canonicalOpportunityId: "opportunity-a", sourceCandidateId: "candidate-a" },
    productReference: { productProfileId: 7, productName: "CrystalArmor", contextFingerprint: fingerprint },
    sources: { recentScriptRevisionIds: [] },
    opportunity: {
      targetAudience: "commuters",
      useMoment: "on a train",
      purchaseMotivation: "reduce casual side viewing",
      tensionOrObjection: "people nearby can glance at the screen",
      creativeOpportunity: "make the next-seat viewpoint visible",
    },
    direction: {
      contentMechanisms: ["point-of-view switch"],
      creativeAngle: "show what the next seat can see",
      creatorPersona: "commuter",
      contentFormat: "observational diary",
      spokenTone: "curious",
    },
    opening: {
      hookMechanism: "visual question",
      hookLine: "What changes from the next seat?",
      visual: { subject: "phone", setup: "train seat", action: "camera moves from front to side", visibleChangeOrQuestion: "the visible screen changes" },
    },
    truth: { primaryProductTruth: "28° viewing angle", secondaryProductTruths: ["alignment applicator"] },
    evidence: { type: "routine-context", objective: "show the ordinary viewing angle", visualEvidence: ["move from front to side"], limitations: ["do not claim total privacy"] },
    ctaDirection: "invite viewers to check compatible models",
    riskBoundaries: {
      prohibitedClaims: ["unbreakable", "100% protection"],
      requiredQualifiers: ["viewing changes with angle"],
      safetyConstraints: ["do not claim guaranteed results"],
    },
    createdAt: "2026-09-27T00:00:00.000Z",
  };
  return { ...value, ...overrides };
}

function input(overrides = {}) {
  const creativeBrief = overrides.creativeBrief || brief();
  return {
    projectId: "project-a",
    requestId: "request-a",
    creativeBriefReference: { id: creativeBrief.id, revisionId: creativeBrief.revisionId },
    creativeBrief,
    productContext,
    productContextFingerprint: fingerprint,
    platform: "TikTok",
    market: "Spain",
    languageContext: { workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok" },
    language: "Spanish",
    preferences: { durationSeconds: 20, creatorStyle: "UGC", spokenDensity: "balanced", toneSteering: "natural", variantCount: 1 },
    ...overrides,
  };
}

function draft(overrides = {}) {
  return {
    title: "邻座视角观察",
    hook: { line: "手机转向侧面时，画面会有什么变化？", openingVisualExecution: "同一部手机从正面缓慢转到侧面。" },
    scenes: [
      { id: "hook", purpose: "hook", visual: "通勤座位上的手机占满首帧。", action: "保持环境不变，将视角从正面移向侧面。", dialogue: "手机转向侧面时，画面会有什么变化？", evidenceRole: "建立视觉问题", durationHint: 3, briefTrace: { executesOpeningVisual: true } },
      { id: "context", purpose: "context", visual: "手机旁边坐着一位通勤乘客。", action: "保持手机位置不变。", dialogue: "这是邻座在日常通勤中的观看角度。", evidenceRole: "交代使用场景", durationHint: 4 },
      { id: "product", purpose: "product", visual: "手机与对位安装器同时出现。", action: "用对位安装器完成一次清晰操作。", dialogue: "对位安装器可以辅助安装。", evidenceRole: "连接产品事实", durationHint: 4 },
      { id: "evidence", purpose: "evidence", visual: "同一镜头连续展示正面和侧面视角。", action: "在相同光线下对比两个位置。", dialogue: "随着观看角度变化，观察屏幕可见范围。", durationHint: 5, evidenceRole: "日常场景观察", briefTrace: { executesEvidence: true } },
      { id: "cta", purpose: "cta", visual: "手机型号与包装信息同时出现。", action: "指向适配型号信息。", dialogue: "可以先确认适合自己手机的型号。", evidenceRole: "承接行动方向", durationHint: 4, briefTrace: { executesCTA: true } },
    ],
    fullNarration: "手机转向侧面时，画面会有什么变化？这是邻座在日常通勤中的观看角度。对位安装器可以辅助安装。随着观看角度变化，观察屏幕可见范围。可以先确认适合自己手机的型号。",
    cta: "可以先确认适合自己手机的型号。",
    workspaceLanguage: "zh-CN",
    targetLanguage: "Spanish",
    localizationStatus: "source",
    totalDurationHint: 20,
    ...overrides,
  };
}

const parse = (value) => api.parseScriptDraftV2(typeof value === "string" ? value : JSON.stringify(value));
const issueCodes = (issues) => issues.map((item) => item.code);

test("ScriptWriterInput accepts matching canonical identities and derives immutable locked decisions", () => {
  assert.deepEqual(api.validateScriptWriterInput(input()), []);
  const source = brief();
  const locked = api.deriveBriefLockedDecisions(source);
  assert.equal(locked.targetAudience, source.opportunity.targetAudience);
  assert.equal(locked.creativeAngle, source.direction.creativeAngle);
  assert.deepEqual(locked.openingVisual, source.opening.visual);
  locked.openingVisual.subject = "changed copy";
  locked.riskBoundaries.prohibitedClaims.push("new boundary");
  assert.equal(source.opening.visual.subject, "phone");
  assert.equal(source.riskBoundaries.prohibitedClaims.includes("new boundary"), false);
});

test("input identity rejects foreign Project, Brief ID, revision and Product fingerprints", () => {
  assert.ok(issueCodes(api.validateScriptWriterInput(input({ projectId: "project-b" }))).includes("foreign_project"));
  assert.ok(issueCodes(api.validateScriptWriterInput(input({ creativeBriefReference: { id: "wrong", revisionId: "creative-brief-revision-a" } }))).includes("brief_id_mismatch"));
  assert.ok(issueCodes(api.validateScriptWriterInput(input({ creativeBriefReference: { id: "creative-brief-a", revisionId: "wrong" } }))).includes("brief_revision_mismatch"));
  assert.ok(issueCodes(api.validateScriptWriterInput(input({ productContextFingerprint: "wrong" }))).includes("product_fingerprint_mismatch"));
  const wrongBrief = brief({ productReference: { ...brief().productReference, contextFingerprint: "wrong" } });
  assert.ok(issueCodes(api.validateScriptWriterInput(input({ creativeBrief: wrongBrief, creativeBriefReference: { id: wrongBrief.id, revisionId: wrongBrief.revisionId } }))).includes("brief_product_fingerprint_mismatch"));
});

test("strict parser accepts a valid ScriptDraftV2", () => {
  const result = parse(draft());
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.value, draft());
});

test("legacy Draft language records remain readable without destructive migration", () => {
  const legacy = draft();
  delete legacy.workspaceLanguage;
  delete legacy.targetLanguage;
  delete legacy.localizationStatus;
  legacy.language = "Spanish";
  const snapshot = JSON.stringify(legacy);
  const parsed = parse(legacy);
  assert.ok(parsed.value);
  assert.equal(parsed.value.language, "Spanish");
  assert.equal(JSON.stringify(legacy), snapshot);
});

test("strict parser rejects invalid JSON, missing and blank fields", () => {
  assert.equal(parse("not-json").issues[0].code, "invalid_json");
  const missing = draft(); delete missing.title;
  assert.ok(parse(missing).issues.some((item) => item.code === "missing_field" && item.path === "title"));
  assert.ok(parse({ ...draft(), cta: " " }).issues.some((item) => item.code === "blank_or_invalid_string" && item.path === "cta"));
});

test("strict parser rejects invalid purpose, duplicate IDs, durations and traces", () => {
  const invalid = draft();
  invalid.scenes[1].purpose = "director-shot";
  invalid.scenes[2].id = invalid.scenes[0].id;
  invalid.scenes[3].durationHint = -1;
  invalid.scenes[4].briefTrace = { executesCTA: "yes" };
  const issues = parse(invalid).issues;
  for (const code of ["invalid_scene_purpose", "duplicate_scene_id", "invalid_duration", "malformed_trace"]) assert.ok(issueCodes(issues).includes(code), code);
});

test("strict parser rejects empty scenes, invalid language and Provider-controlled identities or Director fields", () => {
  assert.ok(issueCodes(parse({ ...draft(), scenes: [] }).issues).includes("empty_scenes"));
  assert.ok(parse({ ...draft(), workspaceLanguage: "en-US" }).issues.some((item) => item.path === "workspaceLanguage"));
  assert.ok(parse({ ...draft(), projectId: "project-a" }).issues.some((item) => item.code === "unexpected_field" && item.path === "projectId"));
  const directorDraft = draft(); directorDraft.scenes[0].cameraMovement = "Push In";
  assert.ok(parse(directorDraft).issues.some((item) => item.code === "unexpected_field" && item.path.endsWith("cameraMovement")));
});

test("structural fidelity requires hook first, opening trace, evidence trace, CTA trace and language", () => {
  const value = draft();
  value.scenes[0].purpose = "context";
  delete value.scenes[0].briefTrace;
  delete value.scenes[3].briefTrace;
  delete value.scenes[4].briefTrace;
  value.workspaceLanguage = "en-US";
  const codes = issueCodes(api.validateScriptDraftDeterministically(input(), value));
  for (const code of ["first_scene_must_be_hook", "opening_visual_trace_missing", "evidence_trace_missing", "cta_trace_missing", "language_mismatch"]) assert.ok(codes.includes(code), code);
});

test("target language changes do not change the canonical Chinese source language", () => {
  for (const targetLanguage of ["Spanish", "English", "French"]) {
    const languageContext = { workspaceLanguage: "zh-CN", targetLanguage, market: "Spain", platform: "TikTok" };
    const value = draft({ targetLanguage });
    assert.equal(api.validateScriptDraftDeterministically(input({ languageContext }), value).some((item) => item.code === "internal_language_mismatch"), false, targetLanguage);
  }
});

test("language fidelity rejects non-Chinese canonical source copy", () => {
  const english = draft({ title: "English title", hook: { line: "English hook", openingVisualExecution: "English visual" }, fullNarration: "English narration", cta: "English CTA" });
  assert.ok(api.validateScriptDraftDeterministically(input(), english).some((item) => item.code === "internal_language_mismatch"));
});

test("semantic fidelity is intentionally deferred instead of approximated with string heuristics", () => {
  const semanticallyDifferent = draft({ hook: { line: "A deliberately unrelated but safe sentence.", openingVisualExecution: "A safe unrelated action." } });
  const codes = issueCodes(api.validateScriptDraftDeterministically(input(), semanticallyDifferent));
  assert.equal(codes.includes("brief_hook_fidelity"), false);
  assert.equal(codes.includes("creative_angle_drift"), false);
  assert.equal(codes.includes("cta_drift"), false);
});

test("consumer-facing assertion validation accepts supported claims and ignores Brief safety metadata", () => {
  const safe = api.validateScriptDraftDeterministically(input(), draft());
  assert.deepEqual(safe, []);
  const metadataBrief = brief({ riskBoundaries: { prohibitedClaims: ["doctor recommended", "100% protection"], requiredQualifiers: ["never promise guaranteed results"], safetyConstraints: ["do not say unbreakable"] } });
  const metadataInput = input({ creativeBrief: metadataBrief, creativeBriefReference: { id: metadataBrief.id, revisionId: metadataBrief.revisionId } });
  assert.deepEqual(api.validateScriptDraftDeterministically(metadataInput, draft()), []);
});

test("consumer-facing assertions reject prohibited, high-risk, unsupported truth and numeric claims", () => {
  const prohibited = draft({ cta: "It is unbreakable." });
  assert.ok(issueCodes(api.validateScriptDraftDeterministically(input(), prohibited)).includes("prohibited_claim"));
  const highRisk = draft({ cta: "Guaranteed results for everyone." });
  assert.ok(issueCodes(api.validateScriptDraftDeterministically(input(), highRisk)).includes("high_risk_compliance"));
  const unsupported = draft({ cta: "This product is officially approved." });
  assert.ok(issueCodes(api.validateScriptDraftDeterministically(input(), unsupported)).includes("unsupported_product_truth"));
  const numeric = draft({ cta: "Get 99% protection." });
  assert.ok(issueCodes(api.validateScriptDraftDeterministically(input(), numeric)).includes("unsupported_numeric_claim"));
});

test("Script reuses category-neutral product result grounding across every consumer surface", () => {
  const unsafe = draft({
    hook: { line: "贴膜后手机摔落，屏幕完好无损", openingVisualExecution: "手机意外滑落。" },
    scenes: draft().scenes.map((scene, index) => index === 3 ? { ...scene, dialogue: "看，膜没事，屏幕也没事。", visual: "捡起手机，屏幕没有碎裂。" } : scene),
    fullNarration: "贴膜后手机摔落，屏幕完好无损。看，膜没事，屏幕也没事。",
  });
  const issues = api.validateScriptDraftDeterministically(input(), unsafe);
  assert.ok(issues.some((item) => item.code === "unsupported_product_truth" && item.ruleFamily === "product_claim_grounding" && item.ruleCode === "unsupported_product_result" && item.path === "hook.line"));
  assert.ok(issues.some((item) => item.path === "scenes.3.visual"));
  assert.ok(issues.some((item) => item.path === "fullNarration"));
});

test("StructuredScript adapter preserves Director-compatible scenes and injects trusted Brief lineage", () => {
  const sourceDraft = draft();
  sourceDraft.creativeAngle = "provider override";
  const parsed = parse(sourceDraft);
  assert.equal(parsed.value, null, "Provider cannot add creativeAngle to the strict draft");
  delete sourceDraft.creativeAngle;
  const script = api.adaptScriptDraftToStructuredScript(input(), sourceDraft, "script-revision-a");
  assert.equal(script.revisionId, "script-revision-a");
  assert.equal(script.sourceCreativeBriefId, "creative-brief-a");
  assert.equal(script.sourceCreativeBriefRevisionId, "creative-brief-revision-a");
  assert.equal(script.product, productContext.productName);
  assert.equal(script.creativeAngle, brief().direction.creativeAngle);
  assert.equal(script.narration, sourceDraft.fullNarration);
  assert.equal(script.scenes.length, sourceDraft.scenes.length);
  assert.deepEqual(script.scenes[0], { time: "0–3s", visual: sourceDraft.scenes[0].visual, line: sourceDraft.scenes[0].dialogue, edit: sourceDraft.scenes[0].action });
});

test("Brief revisions produce distinct Script revisions without mutating old Scripts", () => {
  const oldScript = api.adaptScriptDraftToStructuredScript(input(), draft(), "script-revision-a");
  const snapshot = structuredClone(oldScript);
  const briefB = brief({ revisionId: "creative-brief-revision-b", ctaDirection: "invite a compatibility check" });
  const scriptB = api.adaptScriptDraftToStructuredScript(input({ creativeBrief: briefB, creativeBriefReference: { id: briefB.id, revisionId: briefB.revisionId } }), draft(), "script-revision-b");
  assert.notEqual(oldScript.revisionId, scriptB.revisionId);
  assert.equal(scriptB.sourceCreativeBriefRevisionId, "creative-brief-revision-b");
  assert.deepEqual(oldScript, snapshot);
});

test("target language changes do not rewrite the canonical Chinese Script revision", () => {
  const spanish = input({ languageContext: { workspaceLanguage: "zh-CN", targetLanguage: "Spanish", market: "Spain", platform: "TikTok" } });
  const french = input({ languageContext: { workspaceLanguage: "zh-CN", targetLanguage: "French", market: "Spain", platform: "TikTok" } });
  const first = api.adaptScriptDraftToStructuredScript(spanish, draft({ targetLanguage: "Spanish" }), "script-revision-source-a");
  const second = api.adaptScriptDraftToStructuredScript(french, draft({ targetLanguage: "French" }), "script-revision-source-a");
  assert.deepEqual(second, first);
  assert.equal(first.language, "zh-CN");
});

test("TargetedRewrite contract accepts only stable field patches and rejects entire-script or identity targets", () => {
  assert.deepEqual(api.validateTargetedRewrite({ changes: [{ target: { scope: "scene", sceneId: "evidence", field: "dialogue" }, replacement: "更清楚的证据表达。" }] }, draft()), []);
  assert.ok(issueCodes(api.validateTargetedRewrite({ changes: [{ target: { scope: "replaceEntireScript" }, replacement: "replacement" }] }, draft())).includes("invalid_patch_scope"));
  assert.ok(issueCodes(api.validateTargetedRewrite({ changes: [{ target: { scope: "scene", sceneId: "evidence", field: "sourceCreativeBriefId" }, replacement: "wrong" }] }, draft())).includes("invalid_patch_field"));
});

const categoryFixtures = [
  ["Screen Protector", "commuters", "viewing-angle switch", "routine-context"],
  ["Probiotic Toothpaste", "routine-focused adults", "morning routine diary", "education"],
  ["Mascara", "makeup users", "one-eye application sequence", "application"],
  ["Moisturizing Stick", "travelers", "on-the-go application", "sensory"],
  ["Electric Toothbrush", "habit builders", "guided brushing routine", "routine-context"],
];

test("five product categories use the same foundation contract with creativity supplied only by Brief fixtures", () => {
  for (const [name, audience, mechanism, evidenceType] of categoryFixtures) {
    const context = { productName: name, profileId: null, productKnowledge: { name, sellingPoints: `${name} supported product fact` } };
    const contextFingerprint = selection.productContextFingerprint(context);
    const categoryBrief = brief({
      id: `brief-${name}`,
      revisionId: `revision-${name}`,
      productReference: { productName: name, contextFingerprint },
      opportunity: { ...brief().opportunity, targetAudience: audience },
      direction: { ...brief().direction, contentMechanisms: [mechanism], creativeAngle: mechanism },
      evidence: { ...brief().evidence, type: evidenceType },
      truth: { primaryProductTruth: `${name} supported product fact`, secondaryProductTruths: [] },
    });
    const categoryInput = input({ projectId: categoryBrief.projectId, creativeBrief: categoryBrief, creativeBriefReference: { id: categoryBrief.id, revisionId: categoryBrief.revisionId }, productContext: context, productContextFingerprint: contextFingerprint });
    const categoryDraft = draft({ scenes: draft().scenes.map((scene) => ({ ...scene, visual: "安全的产品使用场景。", action: "展示已支持的产品用法。", dialogue: "这里展示的是已支持的产品用法。" })), fullNarration: "这里展示的是已支持的产品用法。", cta: "可以查看产品详情。" });
    assert.deepEqual(api.validateScriptWriterInput(categoryInput), []);
    assert.deepEqual(api.validateScriptDraftDeterministically(categoryInput, categoryDraft), [], name);
    const script = api.adaptScriptDraftToStructuredScript(categoryInput, categoryDraft, `script-${name}`);
    assert.equal(script.product, name);
    assert.equal(script.creativeAngle, mechanism);
  }
});

test("production foundation contains no category-to-creative mapping", async () => {
  const source = await readFile(new URL("../app/brief-driven-script.ts", import.meta.url), "utf8");
  for (const [name] of categoryFixtures) assert.equal(source.includes(name), false, name);
  assert.doesNotMatch(source, /category\s*===|switch\s*\(\s*category\s*\)/i);
});
