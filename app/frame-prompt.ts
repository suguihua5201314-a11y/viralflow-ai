import type { DirectorRequest } from "./director-core";
import type { WorkspaceShot } from "./director-workspace";

export type FramePromptContext = {
  projectId: string;
  projectName: string;
  scriptVersion: string;
  visualStyle?: string;
};

export type FramePromptConsistency = {
  character: string[];
  product: string[];
  background: string[];
  camera: string[];
  lighting: string[];
};

export type FramePromptBundle = {
  startFramePrompt: string;
  endFramePrompt: string;
  imagePrompt: string;
  videoPrompt: string;
  consistencyRules: FramePromptConsistency;
  negativePrompt: string;
  motionBridge: string;
  visualGoal: string;
};

const clean = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;
const sentence = (value: string) => value.replace(/[。；;，,\s]+$/u, "");

function visualMode(request: DirectorRequest, visualStyle: string) {
  const source = `${request.context.creativeMode} ${visualStyle}`;
  if (/UGC|KOC|达人|原生/i.test(source)) {
    return "真实自然的 TikTok UGC 实拍，创作者拍摄感，自然光与真实日常环境";
  }
  return clean(visualStyle, "真实产品演示");
}

function productDemo(shot: WorkspaceShot) {
  return /PROOF|PRODUCT|DEMO|SELLING|产品|证明|演示/i.test(
    `${shot.stage} ${shot.purpose} ${shot.shotType}`,
  );
}

function motionText(shot: WorkspaceShot) {
  return sentence(
    [shot.talentAction, shot.productAction]
      .map((value) => clean(value))
      .filter(Boolean)
      .join("；") || "保持当前姿态并自然完成镜头动作",
  );
}

export function buildFramePrompts(
  context: FramePromptContext,
  request: DirectorRequest,
  shot: WorkspaceShot,
): FramePromptBundle {
  const product = clean(request.context.product, "当前产品");
  const subject = clean(shot.subject, "产品与操作人物");
  const environment = clean(shot.environment, "真实日常环境");
  const action = motionText(shot);
  const camera = [shot.framing, shot.cameraAngle, shot.cameraMovement]
    .map((value) => clean(value))
    .filter(Boolean)
    .join("，");
  const visualGoal = sentence(
    clean(shot.visualDescription, `${subject}完成当前分镜动作`),
  );
  const proof = sentence(clean(shot.proofRequirement));
  const mode = visualMode(request, context.visualStyle || "");
  const ratio = /YouTube|横版|16:9/i.test(request.context.platform)
    ? "横屏 16:9"
    : "竖屏 9:16";
  const emphasis = productDemo(shot)
    ? `产品演示优先，${product}必须清晰可见，手部交互和动作结果不能被人物或背景遮挡。`
    : `主体是${subject}，产品保持真实比例、结构和位置。`;

  const startFramePrompt = [
    `${ratio}，${mode}。`,
    `项目：${context.projectName}；市场：${request.context.market}；平台：${request.context.platform}。`,
    `首帧主体：${subject}。产品：${product}。`,
    `动作开始状态：在动作发生前建立清楚、可延续的初始姿态；${visualGoal}。`,
    `构图与机位：${camera || "固定中近景，主体位于画面视觉中心"}。`,
    `场景：${environment}。光线自然稳定，背景不抢产品主体。`,
    emphasis,
    "保持人物、产品、背景、机位、构图、光线和服装可在尾帧中精确延续；不添加未提供的功能、参数、包装、促销或品牌文字。",
  ].join("\n");

  const endFramePrompt = [
    `${ratio}，与首帧属于同一条连续镜头。`,
    "Preserve from Start Frame：保持同一人物、同一产品、同一背景、同一机位、同一构图、同一光线、同一服装和同一拍摄环境。",
    `Change only：${action}。呈现动作完成后的自然结果，其它视觉元素不变。`,
    `尾帧视觉结果：${visualGoal}。`,
    proof ? `可见证明：${proof}。` : "不增加当前导演镜头之外的新效果证明。",
    "手部姿态随动作自然变化，人物身份与产品结构不漂移，不突然切换景别或背景。",
  ].join("\n");

  const imagePrompt = [
    `${ratio}，${mode}。`,
    `为 Shot ${String(shot.order).padStart(2, "0")} 生成一张可执行的 Storyboard 画面：${visualGoal}。`,
    `人物与产品：${subject}；${product}。`,
    `动作：${action}。`,
    `摄影：${camera || "固定机位"}。场景：${environment}。`,
    proof ? `画面必须能读出真实 Proof：${proof}。` : "画面只承担当前镜头信息。",
    emphasis,
    "只使用项目与导演镜头已提供的事实，不增加文字、水印、额外人物或额外产品。",
  ].join("\n");

  const videoPrompt = [
    `从首帧开始，${action}。`,
    `动作在 ${shot.duration.toFixed(1)} 秒镜头内连续自然完成，不跳变、不突然加速。`,
    `镜头运动：${clean(shot.cameraMovement, "固定")}; 景别与角度保持 ${clean(shot.framing, "当前景别")}、${clean(shot.cameraAngle, "当前角度")}。`,
    `场景保持在${environment}，人物面部、服装、背景、${product}的型号、比例、结构和光线全程一致。`,
    proof ? `动作必须真实呈现：${proof}。` : "不虚构额外测试或产品效果。",
    "不要添加额外人物、物体、字幕、随机文字、转场或未经导演指定的镜头运动。",
  ].join("\n");

  const consistencyRules: FramePromptConsistency = {
    character: [
      "同一人物与脸型",
      "发型、肤色和服装保持一致",
      "人物比例与身份不漂移",
    ],
    product: [
      `${product}型号与外观不变化`,
      "产品尺寸、结构、Logo 与数量不变化",
      "动作前后产品连续，不突然消失或变形",
    ],
    background: [`保持${environment}布局一致`, "桌面、道具和背景位置不变化"],
    camera: [
      `${clean(shot.framing, "当前景别")}保持一致`,
      `${clean(shot.cameraAngle, "当前角度")}保持一致`,
      `镜头运动仅允许：${clean(shot.cameraMovement, "固定")}`,
    ],
    lighting: ["主光方向和强度保持一致", "色温与阴影位置不跳变"],
  };

  const negative = new Set([
    "product deformation",
    "duplicate product",
    "changing logo",
    "changing clothes",
    "face drift",
    "background change",
    "camera jump",
    "floating objects",
    "watermark",
    "subtitles",
    "random text",
    "text artifacts",
    "unwanted cuts",
  ]);
  const adaptive = `${subject} ${shot.productAction} ${shot.talentAction} ${product}`;
  if (/手|hand|finger/i.test(adaptive)) {
    negative.add("extra fingers");
    negative.add("deformed hands");
    negative.add("hand blocking product");
  }
  if (/手机|phone|screen/i.test(adaptive)) {
    negative.add("duplicate phone");
    negative.add("wrong phone model");
    negative.add("changing camera layout");
  }
  if (/膜|protector|glass/i.test(adaptive)) {
    negative.add("duplicate screen protector");
    negative.add("screen protector shape change");
  }

  return {
    startFramePrompt,
    endFramePrompt,
    imagePrompt,
    videoPrompt,
    consistencyRules,
    negativePrompt: [...negative].join(", "),
    motionBridge: action,
    visualGoal,
  };
}
