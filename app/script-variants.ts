export type VariantIdentitySource = {
  revisionId?: string;
  id?: number;
  createdAt?: string;
  title: string;
  product: string;
  narration?: string;
};

export type ScriptVariant<TScript, TBlock> = {
  label: string;
  identity: string;
  script: TScript;
  blocks: TBlock[];
};

export function variantIdentity(script: VariantIdentitySource) {
  if (script.revisionId?.trim()) return `revision:${script.revisionId.trim()}`;
  if (script.id != null) return `id:${script.id}`;
  if (script.createdAt) return `created:${script.createdAt}`;
  return `script:${script.title}:${script.product}:${script.narration || ""}`;
}

export function appendScriptVariant<TScript extends VariantIdentitySource, TBlock>(
  current: ScriptVariant<TScript, TBlock>[],
  script: TScript,
  blocks: TBlock[],
) {
  const identity = variantIdentity(script);
  const existingIndex = current.findIndex((variant) => variant.identity === identity);
  if (existingIndex >= 0) return { variants: current, activeIndex: existingIndex, added: false };

  const variants = [
    ...current,
    { label: `V${current.length + 1}`, identity, script, blocks: [...blocks] },
  ];
  return { variants, activeIndex: variants.length - 1, added: true };
}
