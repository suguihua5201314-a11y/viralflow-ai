export type ActiveView = "create" | "video" | "director" | "voice" | "breakdown" | "replicate" | "checker" | "library" | "products" | "reviews" | "history" | "monitor";

export const viewMeta: Record<ActiveView, { label: string; eyebrow: string; description: string }> = {
  create: { label: "AI脚本生成", eyebrow: "AI CREATIVE PIPELINE", description: "从产品卖点到完整口播与逐镜头分镜" },
  breakdown: { label: "爆款拆解", eyebrow: "VIRAL BREAKDOWN", description: "拆解钩子、节奏、证明与转化结构" },
  replicate: { label: "爆款复刻", eyebrow: "VIRAL REPLICATION", description: "保留爆款结构，生成适配产品的新脚本" },
  checker: { label: "违规风险检测", eyebrow: "COMPLIANCE REVIEW", description: "发布前检查文案风险与安全表达" },
  library: { label: "爆款案例库", eyebrow: "CREATIVE LIBRARY", description: "统一管理开头素材与产品卖点" },
  monitor: { label: "爆款监控", eyebrow: "CONTENT MONITOR", description: "跟踪竞品账号与高表现内容" },
  history: { label: "历史脚本", eyebrow: "SCRIPT HISTORY", description: "查看团队已经生成和保存的脚本" },
  video: { label: "爆款视频拆解", eyebrow: "VIDEO INTELLIGENCE", description: "上传视频并分析完整内容框架" },
  director: { label: "AI拍摄导演", eyebrow: "AI SHOOTING DIRECTOR", description: "把脚本转成可以直接执行的拍摄方案" },
  voice: { label: "AI配音", eyebrow: "AI VOICE STUDIO", description: "多语言音色、情绪与节奏控制" },
  products: { label: "产品知识库", eyebrow: "PRODUCT KNOWLEDGE", description: "沉淀产品卖点、参数和合规口径" },
  reviews: { label: "发布与数据复盘", eyebrow: "PUBLISH & ANALYTICS", description: "用真实发布数据指导下一条内容" },
};
