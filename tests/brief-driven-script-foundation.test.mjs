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
    language: "Spanish",
    preferences: { durationSeconds: 20, creatorStyle: "UGC", spokenDensity: "balanced", toneSteering: "natural", variantCount: 1 },
    ...overrides,
  };
}

function draft(overrides = {}) {
  return {
    title: "The next-seat view",
    hook: { line: "What changes when the phone turns?", openingVisualExecution: "The same phone moves from a front view to a side view." },
    scenes: [
      { id: "scene-hook", purpose: "hook", visual: "A phone fills the frame on a train seat.", action: "Move from the front of the phone toward its side.", dialogue: "What changes when the phone turns?", durationHint: 3, briefTrace: { executesOpeningVisual: true } },
      { id: "scene-context", purpose: "context", visual: "A nearby passenger sits beside the phone owner.", action: "Keep the phone in the same position.", dialogue: "This is the everyday angle from the next seat.", durationHint: 4 },
      { id: "scene-product", purpose: "product", visual: "CrystalArmor is shown on the same phone.", action: "Hold the phone without changing brightness.", dialogue: "This screen protector is designed around a 28° viewing angle.", durationHint: 4 },
      { id: "scene-evidence", purpose: "evidence", visual: "The phone is viewed from front and side in one continuous move.", action: "Compare both positions under the same light.", dialogue: "Compare the visible screen as the viewing angle changes.", durationHint: 5, evidenceRole: "routine-context", briefTrace: { executesEvidence: true } },
      { id: "scene-cta", purpose: "cta", visual: "The phone model and package appear together.", action: "Point to the compatibility label.", dialogue: "Check which model matches your phone.", durationHint: 4, briefTrace: { executesCTA: true } },
    ],
    fullNarration: "What changes when the phone turns? This is the everyday angle from the next seat. This screen protector is designed around a 28° viewing angle. Compare the visible screen as the viewing angle changes. Check which model matches your phone.",
    cta: "Check which model matches your phone.",
    language: "Spanish",
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
  assert.ok(parse({ ...draft(), language: 7 }).issues.some((item) => item.path === "language"));
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
  value.language = "English";
  const codes = issueCodes(api.validateScriptDraftDeterministically(input(), value));
  for (const code of ["first_scene_must_be_hook", "opening_visual_trace_missing", "evidence_trace_missing", "cta_trace_missing", "language_mismatch"]) assert.ok(codes.includes(code), code);
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

test("TargetedRewrite contract accepts only stable field patches and rejects entire-script or identity targets", () => {
  assert.deepEqual(api.validateTargetedRewrite({ changes: [{ target: { scope: "scene", sceneId: "scene-evidence", field: "dialogue" }, replacement: "A clearer evidence line." }] }, draft()), []);
  assert.ok(issueCodes(api.validateTargetedRewrite({ changes: [{ target: { scope: "replaceEntireScript" }, replacement: "replacement" }] }, draft())).includes("invalid_patch_scope"));
  assert.ok(issueCodes(api.validateTargetedRewrite({ changes: [{ target: { scope: "scene", sceneId: "scene-evidence", field: "sourceCreativeBriefId" }, replacement: "wrong" }] }, draft())).includes("invalid_patch_field"));
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
    const categoryDraft = draft({ scenes: draft().scenes.map((scene) => ({ ...scene, visual: "A safe product scene.", action: "Show the supported product use.", dialogue: "A supported product use is shown." })), fullNarration: "A supported product use is shown.", cta: "Check the product details." });
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
