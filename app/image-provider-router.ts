export type ImageProviderId = "openai-image" | "doubao-image";
export type ImageType = "Product Image" | "UGC Creator" | "TikTok Ad Creative" | "Lifestyle Scene";
export type ImageStyle = "Realistic" | "UGC" | "Premium" | "Cinematic" | "E-commerce";
export type ImageCamera = "Close Up" | "Macro" | "Wide Shot" | "Handheld";
export type ImageRatio = "9:16" | "1:1" | "16:9";

export type ImageGenerationRequest = { prompt: string; imageType: ImageType; style: ImageStyle; camera: ImageCamera; ratio: ImageRatio; projectId: string };
export type ImageGenerationResult = { provider: ImageProviderId; model: string; imageUrl: string; createdAt: string };
export type ImageProviderStatus = { id: ImageProviderId; label: string; model: string | null; configured: boolean };
export type ImageProviderErrorType = "configuration" | "unauthorized" | "rate_limit" | "moderation_blocked" | "timeout" | "invalid_request" | "provider_error" | "empty_result";

export class ImageProviderError extends Error {
  constructor(public category: ImageProviderErrorType, message: string, public status = 502, public retryable = false) { super(message); this.name = "ImageProviderError"; }
}

export type ImageProviderAdapter = {
  id: ImageProviderId;
  label: string;
  status(): ImageProviderStatus;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResult>;
};

const OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";
const imageSizes: Record<ImageRatio, string> = { "9:16": "1024x1824", "1:1": "1024x1024", "16:9": "1824x1024" };
const imageTypeGuidance: Record<ImageType, string> = {
  "Product Image": "商业产品展示图，主体清晰，材质与细节可信",
  "UGC Creator": "真实达人使用场景，自然构图，避免过度棚拍感",
  "TikTok Ad Creative": "适合短视频广告首帧，视觉重点明确，留出安全文案空间但不要生成文字",
  "Lifestyle Scene": "生活方式场景，产品自然融入真实环境",
};
const styleGuidance: Record<ImageStyle, string> = {
  Realistic: "真实摄影，光影自然，纹理可信", UGC: "用户真实内容风格，轻度不完美，手机摄影质感",
  Premium: "高端商业视觉，精致布光，简洁高级", Cinematic: "电影质感，层次丰富，具有叙事氛围",
  "E-commerce": "电商视觉，主体突出，背景干净，转化导向",
};
const cameraGuidance: Record<ImageCamera, string> = {
  "Close Up": "特写镜头", Macro: "微距镜头，突出材质细节", "Wide Shot": "广角镜头，展示完整环境关系", Handheld: "手持拍摄视角，自然轻微动态感",
};

function buildImagePrompt(request: ImageGenerationRequest) {
  return `${request.prompt.trim()}\n\n创作要求：${imageTypeGuidance[request.imageType]}；${styleGuidance[request.style]}；${cameraGuidance[request.camera]}；画面比例 ${request.ratio}。生成一张可直接用于商业短视频、电商或广告的图片。画面中不要添加水印、品牌标识或模型自行编造的文字。`;
}
function openAIConfig() { return { apiKey: process.env.OPENAI_API_KEY?.trim() || "", model: process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_OPENAI_IMAGE_MODEL }; }
type OpenAIImageResponse = { data?: Array<{ b64_json?: string }>; error?: { code?: string; message?: string; type?: string } };

const openAIImageAdapter: ImageProviderAdapter = {
  id: "openai-image", label: "OpenAI 图片模型",
  status() { const config = openAIConfig(); return { id: this.id, label: this.label, model: config.apiKey ? config.model : null, configured: Boolean(config.apiKey) }; },
  async generate(request) {
    const config = openAIConfig();
    if (!config.apiKey) throw new ImageProviderError("configuration", "图片模型尚未配置，请先添加 OPENAI_API_KEY。", 503);
    let response: Response;
    try {
      response = await fetch(OPENAI_IMAGE_ENDPOINT, {
        method: "POST", headers: { authorization: `Bearer ${config.apiKey}`, "content-type": "application/json" }, signal: AbortSignal.timeout(150000),
        body: JSON.stringify({ model: config.model, prompt: buildImagePrompt(request), size: imageSizes[request.ratio], quality: "medium", output_format: "jpeg", output_compression: 78, n: 1 }),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") throw new ImageProviderError("timeout", "图片生成超时，请稍后重新生成。", 504, true);
      throw new ImageProviderError("provider_error", "暂时无法连接图片生成服务，请稍后重试。", 502, true);
    }
    const payload = await response.json().catch(() => ({})) as OpenAIImageResponse;
    if (!response.ok) {
      const code = payload.error?.code || "";
      if (response.status === 401 || response.status === 403) throw new ImageProviderError("unauthorized", "图片模型认证失败，请检查服务器配置。", 502);
      if (response.status === 429) throw new ImageProviderError("rate_limit", "图片生成请求较多，请稍后重试。", 429, true);
      if (code === "moderation_blocked") throw new ImageProviderError("moderation_blocked", "图片描述未通过安全检查，请调整内容后重试。", 422);
      if (response.status >= 400 && response.status < 500) throw new ImageProviderError("invalid_request", "当前图片描述或参数无法生成，请调整后重试。", 422);
      throw new ImageProviderError("provider_error", "图片模型暂时不可用，请稍后重试。", 502, response.status >= 500);
    }
    const base64 = payload.data?.[0]?.b64_json;
    if (!base64) throw new ImageProviderError("empty_result", "图片模型没有返回图片，请重新生成。", 502, true);
    return { provider: this.id, model: config.model, imageUrl: `data:image/jpeg;base64,${base64}`, createdAt: new Date().toISOString() };
  },
};
const doubaoImageAdapter: ImageProviderAdapter = {
  id: "doubao-image", label: "豆包图片模型",
  status() { return { id: this.id, label: this.label, model: null, configured: false }; },
  async generate() { throw new ImageProviderError("configuration", "豆包图片模型将在后续阶段接入。", 503); },
};
const adapters: Record<ImageProviderId, ImageProviderAdapter> = { "openai-image": openAIImageAdapter, "doubao-image": doubaoImageAdapter };
export function getImageProvider(id: ImageProviderId) { return adapters[id]; }
export function listImageProviders() { return Object.values(adapters).map(adapter => adapter.status()); }
export async function routeImageGeneration(provider: ImageProviderId, request: ImageGenerationRequest) { return getImageProvider(provider).generate(request); }
