import type { ImageProviderId } from "./image-provider-router";

export const IMAGE_ASSET_STORAGE_KEY = "viralflow-image-assets-v1";
export const IMAGE_STUDIO_DRAFT_KEY = "viralflow-image-studio-draft-v1";
export const IMAGE_ASSET_LIMIT = 60;

export type ImageSourceReference = { type: "director-shot"; shotId: string; sourceBlockId: string };
export type ImageAssetMetadata = { size: string; requestId?: string; sourceReference?: ImageSourceReference };

export type ImageAsset = {
  id: string;
  prompt: string;
  imageType: "Product Image" | "UGC Creator" | "TikTok Ad Creative" | "Lifestyle Scene";
  style: "Realistic" | "UGC" | "Premium" | "Cinematic" | "E-commerce";
  camera: "Close Up" | "Macro" | "Wide Shot" | "Handheld";
  ratio: "9:16" | "1:1" | "16:9";
  projectId: string;
  imageUrl: string;
  provider: ImageProviderId;
  model: string;
  createdAt: string;
  metadata?: ImageAssetMetadata;
};

export type ImageStudioDraft = Pick<ImageAsset, "projectId" | "prompt" | "imageType" | "style" | "camera" | "ratio"> & { sourceReference?: ImageSourceReference };

export function readImageAssets(): ImageAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(IMAGE_ASSET_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export function saveImageAssets(assets: ImageAsset[]) {
  if (typeof window === "undefined") return false;
  try { localStorage.setItem(IMAGE_ASSET_STORAGE_KEY, JSON.stringify(assets.slice(0, IMAGE_ASSET_LIMIT))); return true; }
  catch { return false; }
}

export function assetsForProject(assets: ImageAsset[], projectId: string | null) {
  return projectId ? assets.filter(asset => asset.projectId === projectId) : assets;
}

export function saveImageStudioDraft(draft: ImageStudioDraft) {
  if (typeof window === "undefined") return false;
  try { sessionStorage.setItem(IMAGE_STUDIO_DRAFT_KEY, JSON.stringify(draft)); return true; }
  catch { return false; }
}

export function takeImageStudioDraft(): ImageStudioDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(IMAGE_STUDIO_DRAFT_KEY);
    sessionStorage.removeItem(IMAGE_STUDIO_DRAFT_KEY);
    return raw ? JSON.parse(raw) as ImageStudioDraft : null;
  } catch { return null; }
}
