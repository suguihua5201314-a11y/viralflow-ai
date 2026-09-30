import type { ActiveView } from "./navigation";

export const PRODUCTION_STAGES = ["product", "creative", "script", "director", "images"] as const;
export type ProductionStage = typeof PRODUCTION_STAGES[number];
export type ProductionStageStatus = "completed" | "current" | "available" | "locked";

export const PRODUCTION_STAGE_META: Record<ProductionStage, { order: number; label: string; view: ActiveView }> = {
  product: { order: 1, label: "商品", view: "brain" },
  creative: { order: 2, label: "创意", view: "create" },
  script: { order: 3, label: "脚本", view: "create" },
  director: { order: 4, label: "导演", view: "director" },
  images: { order: 5, label: "图片", view: "images" },
};

export type ProductionStageAssets = {
  productContextCoherent: boolean;
  hasSelectedCreativeBrief: boolean;
  hasCurrentScriptRevision: boolean;
  hasCurrentDirectorContext: boolean;
  hasCurrentImageAssets: boolean;
};

export function stageForActiveView(active: ActiveView, assets: ProductionStageAssets): ProductionStage | null {
  if (active === "brain" || active === "products") return "product";
  if (active === "create") return assets.hasCurrentScriptRevision || assets.hasSelectedCreativeBrief ? "script" : "creative";
  if (active === "director") return "director";
  if (active === "frames" || active === "images") return "images";
  return null;
}

export function isProductionStageAvailable(stage: ProductionStage, assets: ProductionStageAssets) {
  if (stage === "product") return true;
  if (stage === "creative") return assets.productContextCoherent;
  if (stage === "script") return assets.productContextCoherent && assets.hasSelectedCreativeBrief;
  if (stage === "director") return assets.productContextCoherent && assets.hasSelectedCreativeBrief && assets.hasCurrentScriptRevision;
  return assets.productContextCoherent && assets.hasSelectedCreativeBrief && assets.hasCurrentScriptRevision && assets.hasCurrentDirectorContext;
}

export function isProductionStageComplete(stage: ProductionStage, assets: ProductionStageAssets) {
  if (stage === "product") return assets.productContextCoherent;
  if (stage === "creative") return assets.productContextCoherent && assets.hasSelectedCreativeBrief;
  if (stage === "script") return assets.productContextCoherent && assets.hasSelectedCreativeBrief && assets.hasCurrentScriptRevision;
  if (stage === "director") return assets.productContextCoherent && assets.hasSelectedCreativeBrief && assets.hasCurrentScriptRevision && assets.hasCurrentDirectorContext;
  return assets.productContextCoherent && assets.hasSelectedCreativeBrief && assets.hasCurrentScriptRevision && assets.hasCurrentDirectorContext && assets.hasCurrentImageAssets;
}

export function latestAvailableProductionStage(assets: ProductionStageAssets): ProductionStage {
  return [...PRODUCTION_STAGES].reverse().find(stage => isProductionStageAvailable(stage, assets)) || "product";
}

export function resolveProductionStage(active: ActiveView, assets: ProductionStageAssets, requested?: ProductionStage | null) {
  const candidate = requested || stageForActiveView(active, assets) || latestAvailableProductionStage(assets);
  return isProductionStageAvailable(candidate, assets) ? candidate : latestAvailableProductionStage(assets);
}

export function productionStageStatuses(current: ProductionStage, assets: ProductionStageAssets): Record<ProductionStage, ProductionStageStatus> {
  return Object.fromEntries(PRODUCTION_STAGES.map(stage => [
    stage,
    stage === current ? "current" : !isProductionStageAvailable(stage, assets) ? "locked" : isProductionStageComplete(stage, assets) ? "completed" : "available",
  ])) as Record<ProductionStage, ProductionStageStatus>;
}
