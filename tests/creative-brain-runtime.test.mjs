import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { interopDefault: true });
const runtime = await jiti.import("../app/creative-directions.ts");
const productApi = await jiti.import("../app/product-context.ts");

const profile = { id: 7, name: "CrystalArmor Screen Protector", brand: "CrystalArmor", category: "Phone accessory", sellingPoints: "alignment applicator; dust-removal strip; privacy viewing; oleophobic surface", parameters: "privacy viewing", bannedWords: "100% unbreakable", markets: "Spain", audience: "phone users", price: "", offer: "", notes: "Avoid destructive testing" };
const productContext = productApi.resolveCanonicalProductContext({ productName: profile.name, selectedProductId: 7, profiles: [profile] });
const input = { projectId: "project-a", productContext, market: "Spain", language: "Spanish", platform: "TikTok", preferences: { hookStrategy: "curiosity", framework: "AIDA" }, recentCreativeHistory: [] };
const variants = {
  A: ["commuters", "on a train", "keep side viewing private", "shared seats", "privacy in motion", "camera viewpoint switch", "Can the next seat read this?", "phone", "train seat", "rotate from front to side", "the viewing angle changes"],
  B: ["first-time installers", "at a home desk", "avoid installation rework", "dust under film", "one-pass setup", "guided hand sequence", "Watch what the strip removes", "dust strip", "clean desk", "slide across the screen", "dust lifts before placement"],
  C: ["heavy phone users", "after a workday", "keep daily swipes comfortable", "surface marks", "surface routine", "wipe and swipe ritual", "Look after this swipe", "fingertip", "window light", "swipe then tilt", "marks appear in reflection"],
  D: ["careful buyers", "while comparing accessories", "understand the applicator", "setup uncertainty", "design walkthrough", "object-led explanation", "This part explains setup", "alignment tray", "tabletop", "separate and reconnect parts", "alignment path becomes clear"],
};
const direction = (id, patch = {}) => { const v = variants[id] || variants.A; return { id, targetAudience: v[0], useMoment: v[1], coreMotivation: v[2], coreTension: v[3], creativeAngle: v[4], contentMechanism: v[5], hookLine: v[6], openingVisual: { subject: v[7], setup: v[8], action: v[9], visibleChangeOrQuestion: v[10] }, rationale: "A concise selectable direction", ...patch }; };
const payload = items => JSON.stringify({ directions: items });
const response = content => ({ content, providerRequested: "doubao", providerUsed: "doubao", model: "mock", responseTimeMs: 2 });

test("Stage 1 context uses canonical Product Context and exactly three candidates", () => {
  const context = runtime.buildCreativeDirectionContext({ ...input, candidateCount: 5 });
  assert.equal(context.productTruth.productName, profile.name);
  assert.equal(context.productTruth.brand, profile.brand);
  assert.equal(context.candidateCount, 3);
  assert.equal("sellingPointKnowledge" in context, false);
});

test("lightweight parser requires compact fields and independent OpeningVisual", () => {
  assert.equal(runtime.parseCreativeDirections(payload([direction("A")])).directions.length, 1);
  assert.equal(runtime.parseCreativeDirections("not json").directions.length, 0);
  assert.equal(runtime.parseCreativeDirections(payload([direction("A", { openingVisual: { subject: "phone", setup: "desk" } })])).directions.length, 0);
  assert.notEqual(direction("A").hookLine, direction("A").openingVisual.action);
});

test("Stage 1 does not require evidence, CTA, risks, persona, format, or Product Truth output", () => {
  const candidate = direction("A");
  assert.equal(runtime.parseCreativeDirections(payload([candidate])).directions.length, 1);
  for (const key of ["evidenceStrategy", "ctaDirection", "riskNotes", "creatorPersona", "contentFormat", "productTruth"]) assert.equal(key in candidate, false);
});

test("runtime returns exactly three diverse lightweight directions", async () => {
  const requests = [];
  const result = await runtime.generateCreativeDirections(input, async request => { requests.push(request); return response(payload([direction("A"), direction("B"), direction("C")])); });
  assert.equal(result.status, "success");
  assert.deepEqual(result.directions.map(item => item.id), ["A", "B", "C"]);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].maxTokens, 1200);
  assert.equal(JSON.parse(requests[0].messages[1].content).candidateCount, 3);
});

test("structural duplicates are rejected while diverse candidates pass", () => {
  const same = ["A", "B", "C"].map(id => direction(id, { targetAudience: "same audience", useMoment: "same moment", coreMotivation: "same motivation", creativeAngle: "same angle", contentMechanism: "same mechanism", hookLine: "same hook", openingVisual: { subject: "same phone", setup: "same desk", action: "same action" } }));
  assert.equal(runtime.assessDirectionDiversity(same).passed, false);
  assert.equal(runtime.assessDirectionDiversity([direction("A"), direction("B"), direction("C")]).passed, true);
});

test("truth, compliance, feasibility, numbers, and recent directions are validated", () => {
  assert.ok(runtime.validateCreativeDirection(direction("A", { hookLine: "100% unbreakable forever" }), input).length);
  assert.ok(runtime.validateCreativeDirection(direction("A", { hookLine: "Ready in 17 seconds" }), input).length);
  assert.ok(runtime.validateCreativeDirection(direction("A", { contentMechanism: "Use an open flame" }), input).some(issue => issue.type === "feasibility"));
  const historyInput = { ...input, recentCreativeHistory: [{ title: "old", hook: direction("A").hookLine, creativeAngle: "other", scenario: "", proofMechanism: "", cta: "" }] };
  assert.ok(runtime.validateCreativeDirection(direction("A"), historyInput).some(issue => issue.type === "history"));
});

test("one compact repair preserves valid first-pass directions", async () => {
  const requests = [];
  const result = await runtime.generateCreativeDirections(input, async request => {
    requests.push(request);
    return response(requests.length === 1 ? payload([direction("A"), direction("B")]) : payload([direction("C")]));
  });
  assert.equal(requests.length, 2);
  assert.equal(result.status, "success");
  assert.deepEqual(result.directions.map(item => item.id), ["A", "B", "C"]);
  assert.match(requests[1].messages[0].content, /Return 1 replacement directions only/);
});

test("repair failure preserves partial candidates without deterministic fallback", async () => {
  let calls = 0;
  const result = await runtime.generateCreativeDirections(input, async () => {
    calls++;
    if (calls === 1) return response(payload([direction("A")]));
    throw Object.assign(new Error("offline"), { category: "provider_http_error" });
  });
  assert.equal(calls, 2);
  assert.equal(result.status, "partial");
  assert.deepEqual(result.directions.map(item => item.id), ["A"]);
  assert.equal(result.metadata.fallbackUsed, false);
});

test("initial transport failure stops immediately with no fake directions", async () => {
  let calls = 0;
  const result = await runtime.generateCreativeDirections(input, async () => { calls++; throw Object.assign(new Error("timeout"), { category: "timeout" }); });
  assert.equal(calls, 1);
  assert.equal(result.status, "failure");
  assert.deepEqual(result.directions, []);
  assert.equal(result.metadata.repairAttempted, false);
});

test("provider metadata is retained", async () => {
  const result = await runtime.generateCreativeDirections(input, async () => ({ ...response(payload([direction("A"), direction("B"), direction("C")])), providerRequested: "deepseek", providerUsed: "deepseek", model: "mock-model" }));
  assert.deepEqual([result.metadata.providerRequested, result.metadata.providerUsed, result.metadata.model], ["deepseek", "deepseek", "mock-model"]);
});

test("prompt is lightweight and omits full Opportunity fields", () => {
  const prompt = runtime.creativeDirectionMessages(input)[0].content;
  assert.ok(prompt.length < 1000);
  for (const field of ["evidenceStrategy", "ctaDirection", "riskNotes", "creatorPersona", "contentFormat", "visualEvidence"]) assert.equal(prompt.includes(field), false);
  assert.match(prompt, /Preferences guide but do not dictate/);
});

test("five categories use one neutral Stage 1 runtime", () => {
  for (const [index, name] of ["Screen Protector", "Probiotic Toothpaste", "Mascara", "Moisturizing Stick", "Electric Toothbrush"].entries()) {
    const context = productApi.resolveCanonicalProductContext({ productName: name, selectedProductId: index + 20, profiles: [{ ...profile, id: index + 20, name, category: `Category ${index}` }] });
    assert.equal(runtime.buildCreativeDirectionContext({ ...input, productContext: context }).candidateCount, 3);
  }
});

test("Stage 1 has no persistence, Brief construction, scripts, or category mappings", async () => {
  const source = await readFile(new URL("../app/creative-directions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /ProjectMemory|creativeBriefRevisions|createCreativeBrief|\/api\/scripts/);
  assert.doesNotMatch(source, /if\s*\([^)]*(?:mascara|toothpaste|screen protector)/i);
});

test("frontend safely handles non-JSON failures and valid direction results", async () => {
  await assert.rejects(() => runtime.parseCreativeDirectionApiResponse(new Response("Gateway timeout", { status: 504, headers: { "content-type": "text/plain" } })), /超时/);
  const value = { status: "success", directions: [direction("A"), direction("B"), direction("C")], metadata: { errorType: null }, validationSummary: { issues: [], diversityPassed: true } };
  assert.deepEqual(await runtime.parseCreativeDirectionApiResponse(new Response(JSON.stringify(value), { status: 201, headers: { "content-type": "application/json" } })), value);
});

test("Preview override routes only Creative Brain to DeepSeek", async () => {
  const route = await jiti.import("../app/api/creative-brain/route.ts");
  assert.equal(route.resolveCreativeBrainProvider("doubao", "preview", "deepseek"), "deepseek");
  assert.equal(route.resolveCreativeBrainProvider("doubao", "production", "deepseek"), "doubao");
  assert.equal(route.resolveCreativeBrainProvider("doubao", "preview", "invalid"), "doubao");
  const providerRouter = await readFile(new URL("../app/provider-router.ts", import.meta.url), "utf8");
  assert.doesNotMatch(providerRouter, /CREATIVE_BRAIN_PROVIDER/);
});

test("DeepSeek override leaves lightweight Stage 1 contract unchanged", async () => {
  const route = await readFile(new URL("../app/api/creative-brain/route.ts", import.meta.url), "utf8");
  assert.match(route, /candidateCount: 3/);
  assert.equal(runtime.CREATIVE_DIRECTION_COUNT, 3);
  assert.equal(runtime.CREATIVE_DIRECTION_MAX_TOKENS, 1200);
  assert.doesNotMatch(route, /CreativeOpportunity|evidenceStrategy|ctaDirection|riskNotes/);
});
