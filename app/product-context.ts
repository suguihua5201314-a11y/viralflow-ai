import type { ProductKnowledge } from "./knowledge-context";

export type CanonicalProductProfile = ProductKnowledge & { id: number; name: string };

export type CanonicalProductContext = {
  productName: string;
  profileId: number | null;
  profile?: CanonicalProductProfile;
  productKnowledge?: ProductKnowledge;
};

export function resolveCanonicalProductContext(input: {
  productName: string;
  selectedProductId?: number | null;
  projectProductProfileId?: number | null;
  profiles: CanonicalProductProfile[];
}): CanonicalProductContext {
  const productName = input.productName.trim();
  const profileId = input.selectedProductId ?? input.projectProductProfileId ?? null;
  const profile = profileId == null ? undefined : input.profiles.find((item) => item.id === profileId);
  if (profile) return { productName, profileId: profile.id, profile, productKnowledge: { ...profile, name: productName || profile.name } };
  const legacyMatch = input.profiles.find((item) => item.name.trim().toLowerCase() === productName.toLowerCase());
  return legacyMatch
    ? { productName, profileId: legacyMatch.id, profile: legacyMatch, productKnowledge: { ...legacyMatch, name: productName || legacyMatch.name } }
    : { productName, profileId: null };
}
