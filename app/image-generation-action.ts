import {
  IMAGE_ASSET_LIMIT,
  readImageAssets,
  saveImageAssets,
  type ImageAsset,
  type ImageSourceReference,
} from "./image-assets";
import type {
  ImageGenerationRequest,
  ImageGenerationResult,
} from "./image-provider-router";

type ApiError = {
  type?: string;
  message?: string;
  retryable?: boolean;
};

type ApiResult = {
  image?: ImageGenerationResult;
  error?: ApiError;
};

export class ImageGenerationActionError extends Error {
  constructor(
    public category = "provider_error",
    message = "图片生成暂时中断，请稍后重试。",
    public retryable = true,
  ) {
    super(message);
    this.name = "ImageGenerationActionError";
  }
}

export type GenerateAndSaveImageInput = {
  request: ImageGenerationRequest;
  sourceReference?: ImageSourceReference | null;
  assetIdPrefix?: string;
};

export type GenerateAndSaveImageResult = {
  asset: ImageAsset;
  persisted: boolean;
};

function validImageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function generateAndSaveImage({
  request,
  sourceReference,
  assetIdPrefix = "image",
}: GenerateAndSaveImageInput): Promise<GenerateAndSaveImageResult> {
  let response: Response;
  try {
    response = await fetch("/api/images/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
  } catch {
    throw new ImageGenerationActionError(
      "provider_error",
      "无法连接图片生成服务，请检查网络后重试。",
      true,
    );
  }
  const data = (await response.json().catch(() => ({}))) as ApiResult;
  if (!response.ok || !data.image) {
    throw new ImageGenerationActionError(
      data.error?.type || "provider_error",
      data.error?.message || "图片生成失败，请稍后重试。",
      data.error?.retryable ?? response.status >= 500,
    );
  }
  if (!validImageUrl(data.image.imageUrl)) {
    throw new ImageGenerationActionError(
      "empty_result",
      "图片服务返回了无效地址，请重新生成。",
      true,
    );
  }

  const asset: ImageAsset = {
    id: `${assetIdPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: request.prompt.trim(),
    imageType: request.imageType,
    style: request.style,
    camera: request.camera,
    ratio: request.ratio,
    projectId: request.projectId,
    provider: data.image.provider,
    model: data.image.model,
    imageUrl: data.image.imageUrl,
    createdAt: data.image.createdAt,
    metadata: {
      size: data.image.metadata?.size || request.ratio,
      requestId: data.image.metadata?.requestId,
      ...(sourceReference ? { sourceReference } : {}),
    },
  };
  const next = [
    asset,
    ...readImageAssets().filter((item) => item.id !== asset.id),
  ].slice(0, IMAGE_ASSET_LIMIT);
  const persisted = saveImageAssets(next);
  return { asset, persisted };
}
