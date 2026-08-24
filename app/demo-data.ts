import type { DashboardMetrics } from "./dashboard-metrics";
import type { RecentWorkItem } from "./dashboard";

export type DataMode = "demo" | "real";
export const DATA_MODE: DataMode = process.env.NEXT_PUBLIC_DATA_MODE === "real" ? "real" : "demo";

export type DemoProject = RecentWorkItem & {
  type: "脚本" | "导演" | "语音" | "洞察";
  status: "创作中" | "待审核" | "已完成";
  owner: string;
};

export type AnalyticsData = {
  trend: Array<{ label: string; scripts: number; director: number; voice: number }>;
  contentTypes: Array<{ label: string; value: number; color: string }>;
  markets: Array<{ label: string; value: number; code: string }>;
  services: Array<{ label: string; status: "运行正常" | "待配置"; detail: string }>;
  records: Array<{ id: string; time: string; project: string; product: string; market: string; type: string; status: string; owner: string }>;
};

export const demoProjects: DemoProject[] = [
  { key:"demo-ca-es", title:"结果前置 · 10秒自动除尘安装", product:"CrystalArmor 钢化膜", market:"西班牙", language:"西班牙语", platform:"TikTok", duration:30, updatedAt:"2026-08-24T01:42:00.000Z", current:true, type:"导演", status:"创作中", owner:"苏苏" },
  { key:"demo-oxy-it", title:"通勤口气场景 · 温和清洁", product:"Oxyora 牙膏", market:"意大利", language:"意大利语", platform:"TikTok", duration:35, updatedAt:"2026-08-23T09:18:00.000Z", current:false, type:"脚本", status:"待审核", owner:"小林" },
  { key:"demo-strip-us", title:"使用步骤与前后对比方向", product:"牙贴", market:"美国", language:"英语", platform:"Reels", duration:28, updatedAt:"2026-08-22T07:26:00.000Z", current:false, type:"语音", status:"已完成", owner:"阿杰" },
  { key:"demo-mascara-de", title:"双头睫毛膏 A/B/C 创意赛马", product:"睫毛膏", market:"德国", language:"德语", platform:"TikTok", duration:32, updatedAt:"2026-08-21T11:08:00.000Z", current:false, type:"洞察", status:"已完成", owner:"苏苏" },
];

export const demoActivities = [
  { id:"demo-a1", type:"脚本" as const, title:"生成了 CrystalArmor 脚本方案 V3", timestamp:"2026-08-24T01:42:00.000Z" },
  { id:"demo-a2", type:"案例" as const, title:"完成 Oxyora 意大利市场创意洞察", timestamp:"2026-08-23T09:18:00.000Z" },
  { id:"demo-a3", type:"产品" as const, title:"更新了牙贴美国市场产品资料", timestamp:"2026-08-22T07:26:00.000Z" },
  { id:"demo-a4", type:"脚本" as const, title:"生成睫毛膏德语口播音轨", timestamp:"2026-08-21T11:08:00.000Z" },
];

export const demoDashboardData: DashboardMetrics = {
  counts:{ products:4, cases:18, scripts:36, recent:4, variants:52, director:14, voice:21 },
  periods:{ today:6, week:29, month:86, available:true },
  usage:{ scripts:36, analyzer:18, replication:12, director:14, voice:21 },
  activity:demoActivities,
  trend:[{label:"8/18",count:6},{label:"8/19",count:8},{label:"8/20",count:5},{label:"8/21",count:11},{label:"8/22",count:9},{label:"8/23",count:13},{label:"8/24",count:6}],
  providers:[
    {id:"deepseek",label:"DeepSeek",status:"已连接",connected:true},
    {id:"doubao",label:"豆包 TTS",status:"已连接",connected:true},
    {id:"openai",label:"OpenAI",status:"未配置",connected:false},
  ],
};

export const demoAnalytics: AnalyticsData = {
  trend:[
    {label:"周一",scripts:5,director:2,voice:3},{label:"周二",scripts:7,director:3,voice:4},{label:"周三",scripts:4,director:2,voice:2},
    {label:"周四",scripts:9,director:4,voice:5},{label:"周五",scripts:8,director:3,voice:4},{label:"周六",scripts:11,director:5,voice:6},{label:"周日",scripts:6,director:2,voice:3},
  ],
  contentTypes:[{label:"产品演示",value:38,color:"#7568e8"},{label:"KOC / UGC",value:27,color:"#4f85dd"},{label:"强冲突测评",value:21,color:"#35a1b7"},{label:"故事场景",value:14,color:"#bd6fe4"}],
  markets:[{label:"西班牙",value:42,code:"ES"},{label:"意大利",value:24,code:"IT"},{label:"美国",value:21,code:"US"},{label:"德国",value:13,code:"DE"}],
  services:[{label:"DeepSeek 脚本",status:"运行正常",detail:"脚本与创意生成"},{label:"豆包 TTS",status:"运行正常",detail:"多语言语音生成"},{label:"Analyzer",status:"运行正常",detail:"内容结构分析"},{label:"OpenAI",status:"待配置",detail:"当前未接入"}],
  records:demoProjects.map((item,index)=>({id:item.key,time:["今天 09:42","昨天 17:18","08/22 15:26","08/21 19:08"][index],project:item.title,product:item.product,market:item.market,type:item.type,status:item.status,owner:item.owner})),
};
