export type ImageProviderId = "openai-image" | "doubao-image";

export type ImageGenerationRequest = {
  prompt: string;
  imageType: "Product Image" | "UGC Creator" | "TikTok Ad Creative" | "Lifestyle Scene";
  style: "Realistic" | "UGC" | "Premium" | "Cinematic" | "E-commerce";
  camera: "Close Up" | "Macro" | "Wide Shot" | "Handheld";
  ratio: "9:16" | "1:1" | "16:9";
  projectId: string;
};

export type ImageGenerationResult = {
  provider: ImageProviderId;
  model: string;
  imageUrl: string;
  createdAt: string;
};

export type ImageProviderAdapter = {
  id: ImageProviderId;
  label: string;
  model: string | null;
  configured: boolean;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
};

const unavailable = (id: ImageProviderId, label: string): ImageProviderAdapter => ({
  id,
  label,
  model: null,
  configured: false,
  async generate() {
    throw new Error(`${label} 尚未配置；Step 6.1 不执行真实图片生成。`);
  },
});

const adapters: Record<ImageProviderId, ImageProviderAdapter> = {
  "openai-image": unavailable("openai-image", "OpenAI Image"),
  "doubao-image": unavailable("doubao-image", "豆包图片模型"),
};

export function getImageProvider(id: ImageProviderId) {
  return adapters[id];
}

export function listImageProviders() {
  return Object.values(adapters).map(({ id, label, model, configured }) => ({ id, label, model, configured }));
}

export async function routeImageGeneration(provider: ImageProviderId, request: ImageGenerationRequest) {
  return getImageProvider(provider).generate(request);
}
