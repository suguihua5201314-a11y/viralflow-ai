export type ActiveView = "brain" | "dashboard" | "projects" | "create" | "images" | "frames" | "assets" | "video" | "director" | "voice" | "breakdown" | "replicate" | "checker" | "library" | "products" | "reviews" | "history" | "monitor";

export const viewMeta: Record<ActiveView, { label: string; eyebrow: string; description: string }> = {
  brain: { label: "项目大脑", eyebrow: "项目知识", description: "当前项目的产品事实、受众与参考资料" },
  dashboard: { label: "工作台首页", eyebrow: "创意生产总览", description: "汇总真实创作资产，快速进入下一步工作" },
  projects: { label: "我的项目", eyebrow: "项目工作区", description: "按产品与市场管理从洞察到数据复盘的完整创作流程" },
  create: { label: "AI 创作工作台", eyebrow: "Creative Writing", description: "根据产品与创作参数，生成多条短视频脚本" },
  images: { label: "AI图片创作工作台", eyebrow: "内容制作", description: "面向短视频、电商和广告场景的 AI 商业视觉创作工作台" },
  frames: { label: "画面提示词", eyebrow: "Visual Prompt Studio", description: "把导演镜头转换成首尾帧、图片与视频生成指令" },
  assets: { label: "项目素材库", eyebrow: "项目素材", description: "浏览、筛选和复用当前项目的真实创作素材" },
  breakdown: { label: "爆款洞察", eyebrow: "Creative Research", description: "拆解爆款内容的开场、结构、节奏与证明机制" },
  replicate: { label: "创意复刻", eyebrow: "Creative Strategy", description: "保留爆款机制，结合目标产品生成原创方向" },
  checker: { label: "内容合规", eyebrow: "创意策划", description: "检查脚本中的违规、绝对化与高风险表达" },
  video: { label: "视频洞察", eyebrow: "内容制作", description: "上传视频并分析完整内容框架" },
  director: { label: "AI分镜导演工作台", eyebrow: "Storyboard Director", description: "把脚本转成可执行镜头、动作与拍摄方案" },
  voice: { label: "AI配音工作台", eyebrow: "内容制作", description: "生成多语言口播，为后续视频制作准备音轨" },
  products: { label: "产品知识库", eyebrow: "Project Brain", description: "沉淀产品卖点、参数和合规口径" },
  library: { label: "创意案例库", eyebrow: "知识与素材", description: "统一管理爆款案例、开头素材与产品卖点" },
  monitor: { label: "内容监测", eyebrow: "知识与素材", description: "跟踪竞品账号与高表现内容" },
  history: { label: "脚本历史", eyebrow: "知识与素材", description: "查看团队已经生成和保存的脚本" },
  reviews: { label: "数据中心", eyebrow: "知识与素材", description: "用真实发布数据指导下一条内容" },
};
