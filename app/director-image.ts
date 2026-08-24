import type { DirectorRequest } from "./director-core";
import type { WorkspaceShot } from "./director-workspace";
import type { ImageGenerationRequest } from "./image-provider-router";

export type ShotImageSpec = Pick<ImageGenerationRequest, "prompt" | "imageType" | "style" | "camera" | "ratio" | "model" | "projectId">;

const cameraText = (shot: WorkspaceShot) => [shot.framing, shot.cameraAngle, shot.cameraMovement].filter(Boolean).join(" · ");

export function buildShotImagePrompt(shot: WorkspaceShot, input: DirectorRequest, visualStyle: string) {
  const action = [shot.talentAction, shot.productAction].filter(Boolean).join("；") || "保持当前分镜描述中的动作";
  const prompt = [
    "为当前短视频分镜生成一张单帧商业视觉参考图。",
    `产品：${input.context.product}`,
    `画面用途：${shot.purpose || shot.stage}`,
    `画面描述：${shot.visualDescription}`,
    `镜头：${cameraText(shot)}`,
    `动作：${action}`,
    `产品重点：${shot.productAction || shot.subject}`,
    shot.proofRequirement ? `证明点：${shot.proofRequirement}` : "证明点：当前镜头不新增独立效果证明",
    `拍摄环境：${shot.environment}`,
    `项目语境：${input.context.platform}，${input.context.market}，${input.context.creativeMode}，${visualStyle}`,
    "事实约束：只呈现以上明确提供的产品、动作和证明内容；不得添加未授权功能、参数、包装、效果、促销、品牌文字或水印。",
  ].filter(Boolean).join("\n");
  return prompt.slice(0, 1900);
}

export function shotImageSpec(shot: WorkspaceShot, input: DirectorRequest, visualStyle: string, projectId: string): ShotImageSpec {
  const creative = `${input.context.creativeMode} ${visualStyle}`;
  const imageType: ShotImageSpec["imageType"] = /UGC|KOC|达人/i.test(creative) ? "UGC Creator" : /Product Macro|PROOF|SELLING|PRODUCT/i.test(`${shot.framing} ${shot.stage}`) ? "Product Image" : /TikTok/i.test(input.context.platform) ? "TikTok Ad Creative" : "Lifestyle Scene";
  const style: ShotImageSpec["style"] = /UGC|KOC|原生|自然/i.test(creative) ? "UGC" : /电影|cinematic/i.test(creative) ? "Cinematic" : /高端|premium/i.test(creative) ? "Premium" : "Realistic";
  const camera: ShotImageSpec["camera"] = /Macro/.test(shot.framing) ? "Macro" : /Wide/.test(shot.framing) ? "Wide Shot" : /Handheld/.test(shot.cameraMovement) ? "Handheld" : "Close Up";
  const ratio: ShotImageSpec["ratio"] = /YouTube|横版|16:9/i.test(input.context.platform) ? "16:9" : "9:16";
  return { prompt: buildShotImagePrompt(shot, input, visualStyle), imageType, style, camera, ratio, model: "doubao-image", projectId };
}

export function validGeneratedImageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return false;
  if (/^data:image\/(?:png|jpe?g|webp);base64,/i.test(value)) return true;
  try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; }
  catch { return false; }
}
