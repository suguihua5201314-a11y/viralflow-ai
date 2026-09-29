import type { ProductKnowledge } from "./knowledge-context";

export type CanonicalProductProfile = ProductKnowledge & { id: number; name: string };

export type CanonicalProductContext = {
  productName: string;
  profileId: number | null;
  profile?: CanonicalProductProfile;
  productKnowledge?: ProductKnowledge;
};

export type GroundedProductContextIssueCode =
  | "missing_product_truth"
  | "missing_selected_product_profile"
  | "missing_project_product_profile"
  | "stale_selected_product"
  | "product_identity_mismatch";

export type GroundedProductContextIssue = {
  code: GroundedProductContextIssueCode;
  path: string;
};

export type GroundedProductContextResolution = {
  context: CanonicalProductContext | null;
  issues: GroundedProductContextIssue[];
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

/**
 * Strict resolver for new grounded generation paths. Legacy callers keep the
 * permissive resolver above, while Creative Brain must bind one product name
 * to one existing profile and its facts before a Provider call.
 */
export function resolveGroundedCanonicalProductContext(input: {
  productName: string;
  selectedProductId?: number | null;
  projectProductProfileId?: number | null;
  profiles: CanonicalProductProfile[];
}): GroundedProductContextResolution {
  const issues: GroundedProductContextIssue[] = [];
  const productName = input.productName.trim();
  const selected = input.selectedProductId == null ? undefined : input.profiles.find((item) => item.id === input.selectedProductId);
  const project = input.projectProductProfileId == null ? undefined : input.profiles.find((item) => item.id === input.projectProductProfileId);
  if (input.selectedProductId != null && !selected) issues.push({ code: "missing_selected_product_profile", path: "selectedProductId" });
  if (input.projectProductProfileId != null && !project) issues.push({ code: "missing_project_product_profile", path: "projectProductProfileId" });
  if (selected && project && selected.id !== project.id) issues.push({ code: "stale_selected_product", path: "selectedProductId" });
  const exactName = input.profiles.find((item) => item.name.trim().toLowerCase() === productName.toLowerCase());
  const profile = project || selected || exactName;
  if (!profile) issues.push({ code: "missing_product_truth", path: "productContext.productKnowledge" });
  if (profile && profile.name.trim().toLowerCase() !== productName.toLowerCase()) issues.push({ code: "product_identity_mismatch", path: "productName" });
  if (issues.length || !profile) return { context: null, issues };
  return {
    context: {
      productName: profile.name.trim(),
      profileId: profile.id,
      profile,
      productKnowledge: { ...profile },
    },
    issues: [],
  };
}
