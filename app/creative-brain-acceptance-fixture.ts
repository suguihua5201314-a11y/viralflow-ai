import { productContextFingerprint } from "./creative-opportunity-selection";
import type { CanonicalProductContext } from "./product-context";

export const CREATIVE_BRAIN_ACCEPTANCE_PROFILE = Object.freeze({
  id: 5703001,
  name: "变形金刚保护膜",
  brand: "Transformers",
  category: "手机配件 / 屏幕保护膜",
  sellingPoints: "安装器辅助对位；除尘条帮助处理屏幕表面灰尘；防窥效果；疏油疏水表面；日常滑动顺滑；减少指纹影响；兼容大部分手机壳",
  parameters: "",
  bannedWords: "100%防爆；永不碎；绝对防摔；全网第一；砸不坏",
  markets: "Spain",
  audience: "",
  price: "",
  offer: "",
  notes: "不得声称未提供的抗摔、防碎、低反射或测试结果。",
  updatedAt: "2026-09-29T00:00:00.000Z",
});

export const CREATIVE_BRAIN_ACCEPTANCE_CONTEXT: CanonicalProductContext = Object.freeze({
  productName: CREATIVE_BRAIN_ACCEPTANCE_PROFILE.name,
  profileId: CREATIVE_BRAIN_ACCEPTANCE_PROFILE.id,
  profile: CREATIVE_BRAIN_ACCEPTANCE_PROFILE,
  productKnowledge: CREATIVE_BRAIN_ACCEPTANCE_PROFILE,
});

export const CREATIVE_BRAIN_ACCEPTANCE_FINGERPRINT = productContextFingerprint(CREATIVE_BRAIN_ACCEPTANCE_CONTEXT);

export function validateCreativeBrainAcceptanceBinding(input: {
  projectProductName: string;
  projectProductProfileId?: number | null;
  productContext: CanonicalProductContext;
  productContextFingerprint: string;
}) {
  return input.projectProductName === CREATIVE_BRAIN_ACCEPTANCE_PROFILE.name
    && input.projectProductProfileId === CREATIVE_BRAIN_ACCEPTANCE_PROFILE.id
    && input.productContext.productName === CREATIVE_BRAIN_ACCEPTANCE_PROFILE.name
    && input.productContext.profileId === CREATIVE_BRAIN_ACCEPTANCE_PROFILE.id
    && input.productContextFingerprint === CREATIVE_BRAIN_ACCEPTANCE_FINGERPRINT;
}
