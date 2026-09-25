import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const brain = await jiti.import("../app/creative-brain.ts");
const productApi = await jiti.import("../app/product-context.ts");

const profile = {
  id: 7, name: "CrystalArmor Screen Protector", brand: "CrystalArmor", category: "Phone accessory",
  sellingPoints: "alignment applicator; dust-removal strip; privacy viewing; oleophobic surface",
  parameters: "privacy viewing", bannedWords: "100% unbreakable", markets: "Spain",
  audience: "phone users", price: "", offer: "", notes: "Avoid destructive testing",
};
const productContext = productApi.resolveCanonicalProductContext({ productName: profile.name, selectedProductId: 7, profiles: [profile] });
const baseInput = { projectId: "project-a", productContext, market: "Spain", language: "Spanish", platform: "TikTok", preferences: { hookStrategy: "curiosity", framework: "AIDA" }, recentCreativeHistory: [] };
const evidence = (type = "observable-demonstration", objective = "Make the installation action visible") => ({ type, objective, visualEvidence: ["One continuous hand action"], limitations: ["Do not imply a guaranteed result"] });
const variants = {
  A: ["commuters", "on a train", "keep screen content private", "public visibility", "privacy in motion", "continuous angle turn", "visual reveal", "Can you still read this?", "phone", "train seat", "rotate from front to side", "screen becomes harder to read", "routine-context", "Show privacy in an ordinary commute", "commuter", "observational diary", "check compatible models"],
  B: ["first-time installers", "at a home desk", "avoid installation rework", "dust under film", "one-pass setup", "guided hand sequence", "process curiosity", "Watch what the strip removes", "dust strip", "clean desk", "slide across the screen", "dust lifts before placement", "application", "Make the setup steps observable", "new phone owner", "hands-only tutorial", "review the installation method"],
  C: ["heavy phone users", "after a long workday", "keep daily swipes comfortable", "fingerprints build up", "surface routine", "wipe and swipe ritual", "sensory observation", "Look at the surface after this swipe", "fingertip", "window light", "swipe then tilt the phone", "marks become visible in reflection", "sensory", "Observe the surface during normal use", "office worker", "routine vignette", "consider whether the surface fits daily use"],
  D: ["careful buyers", "while comparing accessories", "understand the applicator design", "uncertainty about setup", "design walkthrough", "object-led explanation", "guided reveal", "This part explains the whole setup", "alignment tray", "plain tabletop", "separate and reconnect the parts", "the alignment path becomes clear", "education", "Explain only the observable design", "practical reviewer", "object breakdown", "review the setup before choosing"],
  E: ["case users", "when changing a phone case", "avoid lifted edges", "fit uncertainty", "case-fit check", "fit sequence", "compatibility question", "Will the edge stay clear?", "phone case", "home desk", "attach the case around the protected screen", "the edge spacing remains visible", "fit-movement", "Observe fit without claiming universal compatibility", "case collector", "fit check", "check the supported model and case"],
  F: ["privacy-conscious workers", "during a coffee break", "control casual side viewing", "shared table exposure", "shared-space glance", "point-of-view switch", "perspective contrast", "What changes from the next seat?", "two chairs", "shared cafe table", "move the camera between seats", "the viewing angle visibly changes", "comparison", "Compare viewpoints without absolute privacy claims", "remote worker", "two-viewpoint vignette", "check whether the viewing behavior suits the setting"],
};
const opportunity = (id, patch = {}) => { const v = variants[id] || variants.A; return ({
  id, targetAudience: v[0], useMoment: v[1], purchaseMotivation: v[2], tensionOrObjection: v[3], opportunity: v[4], contentMechanisms: [v[5]],
  creativeAngle: v[4], hookMechanism: v[6], hookLine: v[7], openingVisual: { subject: v[8], setup: v[9], action: v[10], visibleChangeOrQuestion: v[11] },
  evidenceStrategy: evidence(v[12], v[13]), creatorPersona: v[14], contentFormat: v[15], ctaDirection: v[16], riskNotes: [], ...patch,
}); };
const payload = (items) => JSON.stringify({ opportunities: items });

test("1 canonical Product Context is the only product truth input", () => {
  const context = brain.buildCreativeContext(baseInput);
  assert.equal(context.productTruth.productName, profile.name);
  assert.equal(context.productTruth.brand, profile.brand);
  assert.equal(context.productTruth.parameters, profile.parameters);
  assert.equal(context.productTruth.bannedWords, profile.bannedWords);
  assert.equal("sellingPointKnowledge" in context, false);
});

test("2-5 strict parser validates schema, evidence enum and OpeningVisual", () => {
  assert.equal(brain.parseCreativeOpportunities(payload([opportunity("A")])).opportunities.length, 1);
  assert.equal(brain.parseCreativeOpportunities("not json").opportunities.length, 0);
  assert.equal(brain.parseCreativeOpportunities(payload([opportunity("A", { evidenceStrategy: evidence("invented-proof") })])).opportunities.length, 0);
  assert.equal(brain.parseCreativeOpportunities(payload([opportunity("A", { openingVisual: { subject: "phone", setup: "desk" } })])).opportunities.length, 0);
  assert.equal(brain.parseCreativeOpportunities(payload([opportunity("A"), opportunity("A")])).opportunities.length, 1);
});

test("6-8 candidate count repairs once and returns explicit partial failure", async () => {
  let calls = 0;
  const provider = async () => ({ content: payload([opportunity("A")]), providerRequested: "doubao", providerUsed: "doubao", model: "mock", responseTimeMs: 2 });
  const result = await brain.generateCreativeOpportunities(baseInput, async request => { calls++; return provider(request); });
  assert.equal(calls, 2);
  assert.equal(result.status, "partial");
  assert.equal(result.metadata.repairAttempted, true);
  assert.equal(result.metadata.errorType, "insufficient_candidates");
  assert.equal(result.metadata.fallbackUsed, false);
});

test("6b repair preserves first-pass valid candidates and adds only replacements", async () => {
  const initial = [opportunity("A"), opportunity("B"), opportunity("C"), opportunity("D"), opportunity("E", { openingVisual: { subject: "phone" } })];
  const responses = [payload(initial), payload([opportunity("F")])];
  const requests = [];
  const result = await brain.generateCreativeOpportunities(baseInput, async request => {
    requests.push(request);
    return { content: responses[requests.length - 1], providerRequested: "doubao", providerUsed: "doubao", model: "mock", responseTimeMs: 2 };
  });
  assert.equal(requests.length, 2);
  assert.equal(result.status, "success");
  assert.deepEqual(result.opportunities.map(item => item.id), ["A", "B", "C", "D", "F"]);
  const repairPrompt = requests[1].messages.map(item => item.content).join("\n");
  assert.match(repairPrompt, /Return exactly 1 replacement opportunities/);
  assert.match(repairPrompt, /already-valid opportunities/);
  assert.match(repairPrompt, /"id":"A"/);
});

test("6c repair provider failure preserves first-pass valid candidates", async () => {
  const initial = [opportunity("A"), opportunity("B"), opportunity("C"), opportunity("D"), opportunity("E", { openingVisual: { subject: "phone" } })];
  let calls = 0;
  const result = await brain.generateCreativeOpportunities(baseInput, async () => {
    calls++;
    if (calls === 1) return { content: payload(initial), providerRequested: "doubao", providerUsed: "doubao", model: "mock", responseTimeMs: 2 };
    throw Object.assign(new Error("repair unavailable"), { category: "provider_http_error" });
  });
  assert.equal(calls, 2);
  assert.equal(result.status, "partial");
  assert.deepEqual(result.opportunities.map(item => item.id), ["A", "B", "C", "D"]);
  assert.equal(result.metadata.repairAttempted, true);
  assert.equal(result.metadata.candidateCount, 4);
  assert.equal(result.metadata.validCandidateCount, 4);
  assert.equal(result.metadata.errorType, "provider_http_error");
  assert.equal(result.metadata.fallbackUsed, false);
});

test("6d repair provider failure preserves one candidate and fails only with none", async () => {
  const invalid = id => opportunity(id, { openingVisual: { subject: "phone" } });
  for (const [initial, expectedStatus, expectedIds] of [
    [[opportunity("A"), invalid("B"), invalid("C"), invalid("D"), invalid("E")], "partial", ["A"]],
    [[invalid("A"), invalid("B"), invalid("C"), invalid("D"), invalid("E")], "failure", []],
  ]) {
    let calls = 0;
    const result = await brain.generateCreativeOpportunities(baseInput, async () => {
      calls++;
      if (calls === 1) return { content: payload(initial), providerRequested: "doubao", providerUsed: "doubao", model: "mock", responseTimeMs: 2 };
      throw Object.assign(new Error("repair unavailable"), { category: "provider_http_error" });
    });
    assert.equal(calls, 2);
    assert.equal(result.status, expectedStatus);
    assert.deepEqual(result.opportunities.map(item => item.id), expectedIds);
    assert.equal(result.metadata.validCandidateCount, expectedIds.length);
    assert.equal(result.metadata.errorType, "provider_http_error");
  }
});

test("9 initial transport failures stop without repair or deterministic opportunities", async () => {
  for (const category of ["timeout", "provider_http_error", "missing_field"]) {
    let calls = 0;
    const result = await brain.generateCreativeOpportunities(baseInput, async () => { calls++; throw Object.assign(new Error("offline"), { category }); });
    assert.equal(calls, 1);
    assert.equal(result.status, "failure");
    assert.deepEqual(result.opportunities, []);
    assert.equal(result.metadata.repairAttempted, false);
    assert.equal(result.metadata.fallbackUsed, false);
    assert.equal(result.metadata.errorType, category);
  }
});

test("9b malformed model output and validation shortage remain repair eligible", async () => {
  for (const initial of ["not json", payload([opportunity("A")])]) {
    let calls = 0;
    const result = await brain.generateCreativeOpportunities(baseInput, async request => {
      calls++;
      return { content: calls === 1 ? initial : payload([opportunity("B"), opportunity("C"), opportunity("D"), opportunity("E"), opportunity("F")]), providerRequested: "doubao", providerUsed: "doubao", model: "mock", responseTimeMs: 2, request };
    });
    assert.equal(calls, 2);
    assert.equal(result.metadata.repairAttempted, true);
  }
});

test("9c timeout budget remains below route maxDuration", () => {
  const budget = brain.CREATIVE_BRAIN_RUNTIME_BUDGET;
  assert.equal(brain.creativeBrainWorstCaseApplicationBudgetMs, budget.initialProviderTimeoutMs + budget.repairProviderTimeoutMs + budget.responseBufferMs);
  assert.ok(brain.creativeBrainWorstCaseApplicationBudgetMs < budget.routeMaxDurationSeconds * 1000);
});

test("10 provider metadata is preserved", async () => {
  const items = [opportunity("A"), opportunity("B"), opportunity("C"), opportunity("D"), opportunity("E")];
  const result = await brain.generateCreativeOpportunities(baseInput, async () => ({ content: payload(items), providerRequested: "deepseek", providerUsed: "deepseek", model: "mock-model", responseTimeMs: 9 }));
  assert.equal(result.status, "success");
  assert.deepEqual({ requested: result.metadata.providerRequested, used: result.metadata.providerUsed, model: result.metadata.model }, { requested: "deepseek", used: "deepseek", model: "mock-model" });
});

test("11-13 forbidden, unsupported numeric and recent duplicates are rejected", () => {
  assert.ok(brain.validateCreativeOpportunity(opportunity("A", { hookLine: "100% unbreakable forever" }), baseInput).length > 0);
  assert.ok(brain.validateCreativeOpportunity(opportunity("A", { hookLine: "Certified at 99.9% efficiency" }), baseInput).length > 0);
  assert.ok(brain.validateCreativeOpportunity(opportunity("A", { hookLine: "Ready in 17 seconds" }), baseInput).length > 0);
  const historyInput = { ...baseInput, recentCreativeHistory: [{ title: "old", hook: opportunity("A").hookLine, creativeAngle: "different", scenario: "", proofMechanism: "", cta: "" }] };
  assert.ok(brain.validateCreativeOpportunity(opportunity("A"), historyInput).some(issue => issue.type === "history"));
});

test("14-15 diversity rejects paraphrased structures and accepts distinct structures", () => {
  const same = ["A", "B", "C"].map(id => opportunity(id, { creativeAngle: "Same angle", contentMechanisms: ["Same mechanism"], hookMechanism: "Same hook", openingVisual: { subject: "Same phone", setup: "Same desk", action: "Same action" }, evidenceStrategy: evidence("application", "Same proof"), useMoment: "Same moment" }));
  assert.equal(brain.assessOpportunityDiversity(same).passed, false);
  assert.equal(brain.assessOpportunityDiversity([opportunity("A"), opportunity("B"), opportunity("C")]).passed, true);
});

test("16-18 preferences are steering signals and CTA remains a direction", () => {
  const prompt = brain.creativeBrainMessages(baseInput).map(item => item.content).join("\n");
  assert.match(prompt, /steering signals, not hard templates/i);
  assert.match(prompt, /CTA Direction is strategy, not final CTA copy/i);
  assert.doesNotMatch(prompt, /strictly follow AIDA/i);
});

test("19 five categories use the same category-neutral runtime contract", () => {
  for (const [index, name] of ["Screen Protector", "Probiotic Toothpaste", "Mascara", "Moisturizing Stick", "Electric Toothbrush"].entries()) {
    const context = productApi.resolveCanonicalProductContext({ productName: name, selectedProductId: index + 20, profiles: [{ ...profile, id: index + 20, name, category: `Category ${index}` }] });
    const built = brain.buildCreativeContext({ ...baseInput, productContext: context });
    assert.equal(built.productTruth.productName, name);
    assert.equal(built.candidateCount, 5);
  }
});

test("20-22 runtime has no persistence, legacy concept fallback or real provider calls", async () => {
  const source = await readFile(new URL("../app/creative-brain.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../app/api/creative-brain/route.ts", import.meta.url), "utf8");
  const scriptsRoute = await readFile(new URL("../app/api/scripts/route.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /ProjectMemory|localStorage|creativeBriefRevisions|buildCreativeConcepts/);
  assert.match(route, /generateCreativeOpportunities/);
  assert.doesNotMatch(scriptsRoute, /creative-brain|generateCreativeOpportunities/);
});

test("route-caught provider timeout produces a safe JSON failure contract", async () => {
  const route = await jiti.import("../app/api/creative-brain/route.ts");
  const failure = route.creativeBrainRouteError(Object.assign(new Error("secret provider detail"), { category: "timeout" }));
  assert.deepEqual(failure, { status: "failure", error: { type: "timeout", message: "创意方向生成超时，请重试。" } });
  assert.doesNotMatch(JSON.stringify(failure), /secret provider detail/);
  const runtimeFailure = route.creativeBrainFailurePayload({ status: "failure", opportunities: [], metadata: { providerRequested: "doubao", providerUsed: null, model: null, candidateCount: 0, validCandidateCount: 0, repairAttempted: false, fallbackUsed: false, errorType: "timeout", responseTimeMs: null }, validationSummary: { issues: [], diversityPassed: false } });
  assert.deepEqual(runtimeFailure.error, { type: "timeout", message: "创意方向生成超时，请重试。" });
});
