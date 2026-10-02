const MARKET_ALIASES: Readonly<Record<string, readonly string[]>> = {
  ES: ["ES", "Spain", "España", "Espana", "西班牙"],
  US: ["US", "USA", "United States", "United States of America", "美国", "美國"],
  IT: ["IT", "Italy", "Italia", "意大利", "義大利"],
  DE: ["DE", "Germany", "Deutschland", "德国", "德國"],
  FR: ["FR", "France", "法国", "法國"],
  GB: ["GB", "UK", "United Kingdom", "Great Britain", "英国", "英國"],
} as const;

function normalizedMarketLabel(value: string): string {
  return value.trim().normalize("NFKC").toLocaleLowerCase("und").replace(/[._\s-]+/g, " ");
}

const ALIAS_TO_MARKET = new Map(
  Object.entries(MARKET_ALIASES).flatMap(([identity, aliases]) =>
    aliases.map((alias) => [normalizedMarketLabel(alias), identity] as const),
  ),
);

/** Returns a stable comparison identity while preserving distinct unknown markets. */
export function normalizeMarketIdentity(value: string): string {
  const normalized = normalizedMarketLabel(value);
  if (!normalized) return "";
  const direct = ALIAS_TO_MARKET.get(normalized);
  if (direct) return direct;
  const localeRegion = normalized.match(/^[a-z]{2,3} ([a-z]{2})$/)?.[1]?.toUpperCase();
  if (localeRegion && Object.hasOwn(MARKET_ALIASES, localeRegion)) return localeRegion;
  return `unknown:${normalized}`;
}

/** Parses the Product Knowledge multi-market string into unique canonical identities. */
export function parseMarketIdentities(value: string | null | undefined): string[] {
  const identities = String(value || "")
    .split(/[、，,；;\n]+/)
    .map((entry) => normalizeMarketIdentity(entry))
    .filter(Boolean);
  return [...new Set(identities)];
}

export function marketsAreEquivalent(left: string, right: string): boolean {
  const leftIdentity = normalizeMarketIdentity(left);
  return Boolean(leftIdentity) && leftIdentity === normalizeMarketIdentity(right);
}

export const CANONICAL_MARKET_ALIASES = MARKET_ALIASES;
