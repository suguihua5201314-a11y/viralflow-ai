import { ImageProviderError, listImageProviders, routeImageGeneration, type ImageGenerationRequest, type ImageProviderId } from "../../../image-provider-router";

export const runtime = "nodejs";
export const maxDuration = 180;
const imageTypes = new Set(["Product Image", "UGC Creator", "TikTok Ad Creative", "Lifestyle Scene"]);
const styles = new Set(["Realistic", "UGC", "Premium", "Cinematic", "E-commerce"]);
const cameras = new Set(["Close Up", "Macro", "Wide Shot", "Handheld"]);
const ratios = new Set(["9:16", "1:1", "16:9"]);
const providers = new Set<ImageProviderId>(["doubao-image", "openai-image"]);

export function validateImageRequest(value: unknown): value is ImageGenerationRequest {
  if (!value || typeof value !== "object") return false;
  const body = value as Record<string, unknown>;
  return typeof body.prompt === "string" && body.prompt.trim().length >= 3 && body.prompt.length <= 2000 &&
    typeof body.projectId === "string" && body.projectId.trim().length > 0 &&
    imageTypes.has(String(body.imageType)) && styles.has(String(body.style)) && cameras.has(String(body.camera)) && ratios.has(String(body.ratio));
}
export async function GET() {
  const availableProviders = listImageProviders(); const active = availableProviders.find(provider => provider.id === "doubao-image");
  return Response.json({ activeProvider: "doubao-image", configured: Boolean(active?.configured), model: active?.model || null, providers: availableProviders });
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!validateImageRequest(body)) return Response.json({ error: { type: "invalid_request", message: "请完整填写图片描述、项目和生成参数。", retryable: false } }, { status: 400 });
    const requestedModel = typeof body.model === "string" ? body.model : "doubao-image";
    if (!providers.has(requestedModel as ImageProviderId)) return Response.json({ error: { type: "invalid_request", message: "请选择可用的图片模型。", retryable: false } }, { status: 400 });
    const provider = requestedModel as ImageProviderId;
    return Response.json({ image: await routeImageGeneration(provider, body) });
  } catch (error) {
    if (error instanceof ImageProviderError) {
      console.error("[images.generate]", { category: error.category, status: error.status, retryable: error.retryable });
      return Response.json({ error: { type: error.category, message: error.message, retryable: error.retryable } }, { status: error.status });
    }
    console.error("[images.generate]", { category: "provider_error" });
    return Response.json({ error: { type: "provider_error", message: "图片生成暂时中断，请稍后重试。", retryable: true } }, { status: 500 });
  }
}
