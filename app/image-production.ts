import { matchesFrameAsset, type FrameAssetQuery, type ImageAsset } from "./image-assets";
import type { FramePromptBundle } from "./frame-prompt";

export type ImageProductionStatus = "not-started" | "in-progress" | "complete";

export function frameVariants(assets: ImageAsset[], query: FrameAssetQuery) {
  return assets.filter((asset) => matchesFrameAsset(asset, query));
}

export function adoptedFrameAsset(assets: ImageAsset[], query: FrameAssetQuery) {
  return frameVariants(assets, query)[0];
}

export function adoptExistingImageAsset(assets: ImageAsset[], assetId: string) {
  const selected = assets.find((asset) => asset.id === assetId);
  return selected ? [selected, ...assets.filter((asset) => asset.id !== assetId)] : assets;
}

export function requiredFrameTypes(prompts: Pick<FramePromptBundle, "startFramePrompt" | "endFramePrompt">) {
  const result: Array<"start-frame" | "end-frame"> = ["start-frame"];
  if (prompts.endFramePrompt.trim()) result.push("end-frame");
  return result;
}

export function imageProductionStatus(required: readonly string[], ready: readonly string[]): ImageProductionStatus {
  const count = required.filter((frame) => ready.includes(frame)).length;
  return count === 0 ? "not-started" : count === required.length ? "complete" : "in-progress";
}

export function nextIncompleteShotIndex(statuses: readonly ImageProductionStatus[], current: number) {
  for (let offset = 1; offset <= statuses.length; offset += 1) {
    const index = (current + offset) % statuses.length;
    if (statuses[index] !== "complete") return index;
  }
  return -1;
}
