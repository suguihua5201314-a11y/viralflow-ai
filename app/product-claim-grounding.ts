import type { CreativeDirectionCandidate } from "./creative-contract";
import type { CanonicalProductContext } from "./product-context";

export type ProductClaimGroundingCode =
  | "unsupported_product_capability"
  | "unsupported_product_result"
  | "unsupported_duration_claim"
  | "unsupported_comparative_claim"
  | "claim_exceeds_supported_scope";

export type ProductClaimGroundingIssue = {
  code: ProductClaimGroundingCode;
  path: string;
  capabilityFamily: string;
};

export type ProductClaimAssertionSurface = { path: string; text: string };
type CapabilityFamily = { id: string; truth: RegExp; assertion: RegExp };

// These are cross-category concepts, not category-to-creativity mappings. They
// identify factual capability/result assertions that need a matching truth.
const CAPABILITY_FAMILIES: CapabilityFamily[] = [
  { id: "impact_protection", truth: /抗(?:摔|冲击)|防(?:摔|爆)|耐冲击|drop protection|impact resistant/iu, assertion: /(?:产品|膜|牙膏|睫毛膏|棒|牙刷|它|这层|使用|贴(?:膜)?(?:上|后)).{0,18}(?:抗摔|防摔|保护力|承受.{0,6}(?:跌落|摔落))|(?:隐形但)?(?:强大|强劲|可靠).{0,4}保护力|(?:跌落|摔落|掉落).{0,20}(?:完好|不碎|无损|没事)/iu },
  { id: "reflection_reduction", truth: /低反射|减反射|抗反光|防眩光|low reflection|anti-glare/iu, assertion: /(?:产品|膜|表面|它|这层).{0,16}(?:低反射|减少.{0,4}反射|减少反光|抗反光|防眩光)|(?:反光|反射|眩光).{0,10}(?:减少|消失)/iu },
  { id: "privacy_viewing", truth: /防窥|隐私视角|privacy/iu, assertion: /(?:防窥|隐私保护|侧面.{0,8}(?:看不清|不可见))/iu },
  { id: "alignment_application", truth: /对位|安装器|辅助安装|alignment|applicator/iu, assertion: /(?:安装器|辅助).{0,8}对位|自动对位|精准对位|贴(?:正|齐)/iu },
  { id: "surface_repellency", truth: /疏油|疏水|防油|防水表面|oleophobic|hydrophobic/iu, assertion: /疏油|疏水|油污.{0,8}(?:滑落|不易附着)|水滴.{0,8}(?:滑落|不易附着)/iu },
  { id: "smooth_use", truth: /顺滑|滑动流畅|smooth/iu, assertion: /(?:滑动|触控|使用).{0,8}(?:顺滑|流畅)/iu },
  { id: "fingerprint_reduction", truth: /指纹|fingerprint/iu, assertion: /(?:减少|不易|避免).{0,6}指纹|指纹.{0,8}(?:减少|不易残留|消失)/iu },
  { id: "compatibility", truth: /兼容|适配|compatible/iu, assertion: /(?:兼容|适配).{0,16}(?:手机壳|设备|机型|大部分|多数)|(?:手机壳|设备|机型).{0,10}(?:兼容|适配)/iu },
  { id: "cleaning_effect", truth: /清洁|去除污渍|除尘|clean|remove (?:dust|stains)/iu, assertion: /(?:产品|牙膏|牙刷|它|使用|刷后).{0,12}(?:深层清洁|去除污渍|清除细菌|清除牙菌斑)/iu },
  { id: "health_effect", truth: /益生菌|口腔健康|牙龈|敏感|修护|health|gum|sensitive/iu, assertion: /(?:产品|牙膏|它|使用).{0,12}(?:改善口腔|修护牙龈|缓解敏感|平衡菌群|健康效果)/iu },
  { id: "cosmetic_length_volume", truth: /纤长|浓密|卷翘|睫毛|length|volume|curl/iu, assertion: /(?:睫毛|产品|睫毛膏|它|使用).{0,12}(?:更长|纤长|浓密|卷翘|增长)/iu },
  { id: "moisturization", truth: /保湿|滋润|补水|moistur|hydrat/iu, assertion: /(?:皮肤|产品|棒|它|涂后|使用).{0,12}(?:保湿|滋润|补水|锁水|干纹消失)/iu },
  { id: "powered_performance", truth: /震动|转速|声波|清洁模式|续航|vibration|sonic|battery|mode/iu, assertion: /(?:牙刷|产品|它|使用).{0,12}(?:声波|震动|转速|清洁模式|续航|清洁力)/iu },
];

const PRODUCT_CAUSALITY = /(?:产品|这款|这层|使用|贴(?:上|后)|涂(?:上|后)|刷(?:完|后)|用了|能|可以|能够|让|使|带来|证明|展示结果)/iu;
const RESULT_LANGUAGE = /(?:结果|效果|变得|保持|减少|消失|完好|无损|不碎|保护|防止|避免|改善|提升|增强|修复|治愈|有效)/iu;
const EXCESS_SCOPE = /(?:任何|所有|完全|永久|永远|保证|绝对|无论|百分之百|100%|all|any|always|guarantee)/iu;
const DURATION_SCOPE = /(?:整(?:整)?(?:天|晚|周|月|年)|全天|长期|持续(?:一段时间|数小时|数天|数周|数月|数年)|一整(?:天|晚|周|月|年)|all\s+day|all\s+night|for\s+(?:hours|days|weeks|months|years)|long[- ]lasting)/iu;
const DURABLE_OUTCOME = /(?:效果|结果|状态|表面|外观|屏幕|皮肤|睫毛|牙齿|口腔).{0,18}(?:保持|维持|依然|仍然|持续)|(?:保持|维持|依然|仍然|持续).{0,18}(?:干净|清洁|顺滑|滋润|浓密|卷翘|清新|可见|有效|无痕|无残留)/iu;
const COMPARISON_SUBJECT = /(?:普通|一般|其他|同类|传统|竞品|对照组|常规|generic|ordinary|other|competing|competitor|conventional)/iu;
const COMPARISON_CONCLUSION = /(?:一定|必然|明显|显著|更(?:好|差|强|弱|快|慢|干净|顺滑|持久|有效)|不如|优于|胜过|超越|表现为|(?:散开|滑落|残留|消失|保持|清除|减少|增加).{0,16}(?:而|但|相比|本产品|本品|这款)|(?:而|但|相比|本产品|本品|这款).{0,16}(?:散开|滑落|残留|消失|保持|清除|减少|增加)|always|definitely|clearly|better|worse|outperform)/iu;
const COMPARISON_MECHANISM_ONLY = /(?:A\s*\/\s*B|并排|对照|对比).{0,16}(?:画面|镜头|演示|观察|测试|展示)/iu;
const STRONG_OBSERVABLE_OUTCOME = /(?:不|无|零|没有).{0,3}(?:痕|残留|污渍|指纹|问题|损伤|破损|碎裂|灰尘|气泡|歪斜|偏移)|(?:全部|彻底|始终|必然|一定).{0,10}(?:消失|滑落|清除|保持|有效)/iu;

export type CreativeClaimScope = "scenario" | "visual_metaphor" | "product_capability" | "product_result" | "duration_claim" | "comparative_claim" | "numeric_claim";

export function classifyCreativeClaimScope(text: string): CreativeClaimScope {
  if (/\d+(?:[.,]\d+)?\s*(?:%|秒|分钟|小时|天|周|月|年|mm|cm|mah|w)\b/iu.test(text)) return "numeric_claim";
  if (COMPARISON_SUBJECT.test(text) && COMPARISON_CONCLUSION.test(text) && !COMPARISON_MECHANISM_ONLY.test(text)) return "comparative_claim";
  if (DURATION_SCOPE.test(text) && DURABLE_OUTCOME.test(text)) return "duration_claim";
  if (RESULT_LANGUAGE.test(text) || STRONG_OBSERVABLE_OUTCOME.test(text)) return "product_result";
  if (CAPABILITY_FAMILIES.some((family) => family.assertion.test(text)) && PRODUCT_CAUSALITY.test(text)) return "product_capability";
  if (/(?:像|仿佛|如同|转场|隐喻|metaphor|like\s+a)/iu.test(text) && !PRODUCT_CAUSALITY.test(text)) return "visual_metaphor";
  return "scenario";
}

export function collectCreativeDirectionAssertionSurface(direction: CreativeDirectionCandidate): ProductClaimAssertionSurface[] {
  return [
    { path: "creativeAngle", text: direction.creativeAngle },
    { path: "contentMechanism", text: direction.contentMechanism },
    { path: "hookLine", text: direction.hookLine },
    { path: "openingVisual.subject", text: direction.openingVisual.subject },
    { path: "openingVisual.setup", text: direction.openingVisual.setup },
    { path: "openingVisual.action", text: direction.openingVisual.action },
    { path: "openingVisual.visibleChangeOrQuestion", text: direction.openingVisual.visibleChangeOrQuestion || "" },
    { path: "rationale", text: direction.rationale || "" },
  ].filter((item) => item.text.trim());
}

function canonicalTruth(context: CanonicalProductContext) {
  const knowledge = context.productKnowledge;
  // notes/bannedWords are safety metadata and never affirmative Product Truth.
  return [knowledge?.sellingPoints, knowledge?.parameters, knowledge?.offer, knowledge?.price]
    .filter(Boolean).join("；");
}

export function validateProductClaimSurfaces(
  surfaces: ProductClaimAssertionSurface[],
  context: CanonicalProductContext,
): ProductClaimGroundingIssue[] {
  const truth = canonicalTruth(context);
  const issues: ProductClaimGroundingIssue[] = [];
  for (const surface of surfaces.filter((item) => item.text.trim())) {
    const scope = classifyCreativeClaimScope(surface.text);
    const matchingFamily = CAPABILITY_FAMILIES.find((family) => family.assertion.test(surface.text));
    const familyId = matchingFamily?.id || "cross_category_claim_scope";
    if (scope === "duration_claim" && !DURATION_SCOPE.test(truth)) {
      issues.push({ code: "unsupported_duration_claim", path: surface.path, capabilityFamily: familyId });
    }
    if (scope === "comparative_claim" && !(COMPARISON_SUBJECT.test(truth) && COMPARISON_CONCLUSION.test(truth))) {
      issues.push({ code: "unsupported_comparative_claim", path: surface.path, capabilityFamily: familyId });
    }
    if (scope === "product_result" && STRONG_OBSERVABLE_OUTCOME.test(surface.text) && !STRONG_OBSERVABLE_OUTCOME.test(truth)) {
      issues.push({ code: "unsupported_product_result", path: surface.path, capabilityFamily: familyId });
    }
    for (const family of CAPABILITY_FAMILIES) {
      if (!family.assertion.test(surface.text)) continue;
      // A scene such as “手机从手中滑落” has no capability/result assertion.
      // Metaphor alone also passes unless product causality/result language turns
      // it into a literal product assertion.
      const isAssertion = PRODUCT_CAUSALITY.test(surface.text) || RESULT_LANGUAGE.test(surface.text) || family.id !== "impact_protection";
      if (!isAssertion) continue;
      if (!family.truth.test(truth)) {
        issues.push({
          code: RESULT_LANGUAGE.test(surface.text) ? "unsupported_product_result" : "unsupported_product_capability",
          path: surface.path,
          capabilityFamily: family.id,
        });
      } else if (EXCESS_SCOPE.test(surface.text)) {
        issues.push({ code: "claim_exceeds_supported_scope", path: surface.path, capabilityFamily: family.id });
      }
    }
  }
  return issues.filter((issue, index, all) => all.findIndex((item) => item.code === issue.code && item.path === issue.path && item.capabilityFamily === issue.capabilityFamily) === index);
}

export function validateCreativeDirectionProductGrounding(
  direction: CreativeDirectionCandidate,
  context: CanonicalProductContext,
): ProductClaimGroundingIssue[] {
  return validateProductClaimSurfaces(collectCreativeDirectionAssertionSurface(direction), context);
}
