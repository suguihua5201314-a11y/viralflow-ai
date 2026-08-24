import type { ImageProviderId } from "./image-provider-router";

export const IMAGE_ASSET_STORAGE_KEY = "viralflow-image-assets-v1";

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
  metadata?: { size: string; requestId?: string };
};

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
  try { localStorage.setItem(IMAGE_ASSET_STORAGE_KEY, JSON.stringify(assets.slice(0, 6))); return true; }
  catch { return false; }
}

export function assetsForProject(assets: ImageAsset[], projectId: string | null) {
  return projectId ? assets.filter(asset => asset.projectId === projectId) : assets;
}
