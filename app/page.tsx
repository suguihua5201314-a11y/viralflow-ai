"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { frameworkCatalog } from "./frameworks";
import { seedHooks } from "./hook-seeds";
import { checkCompliance } from "./compliance-rules";
import VideoAnalyzer from "./video-analyzer";
import ShootingDirector from "./shooting-director";
import VoiceStudio from "./voice-studio";
import AppShell from "./components/layout/app-shell";
import WorkflowStepBar from "./components/layout/workflow-step-bar";
import Sidebar from "./components/layout/sidebar";
import TopHeader from "./components/layout/top-header";
import type { GlobalSearchItem } from "./components/layout/top-header";
import Dashboard, { type RecentWorkItem } from "./dashboard";
import { buildDashboardMetrics } from "./dashboard-metrics";
import ScriptStudio, { type GenerationControls } from "./script-studio";
import ViralAnalyzer from "./viral-analyzer";
import ViralReplication from "./viral-replication";
import { adaptLegacyCases, viralCaseReference, type ViralCase } from "./viral-analysis";
import type { StructuredScript } from "./script-generation";
import type { ReplicationSetup } from "./replication-core";
import type {ProviderId,ProviderRunMetadata,ProviderStatus} from "./provider-types";
import { viewMeta, type ActiveView } from "./navigation";
import type {DirectorRequest,DirectorSourceType} from "./director-core";
import {notifyWorkspace} from "./components/ui/workspace-feedback";
import DataCenter from "./data-center";
import {DATA_MODE,demoAnalytics,demoDashboardData,demoProjects,type DemoProject} from "./demo-data";
import {demoDirectorInput,demoDirectorWorkspace} from "./demo-director";
import {demoScript,demoScriptVariations} from "./demo-script";
import {restoreProjectScriptState} from "./script-workspace";
import ProjectBrainWorkspace from "./components/project-brain/project-brain-workspace";
import ProjectWorkspace from "./project-workspace";
import {cacheProjectMemory,readProjectMemory,touchProject,type PersistentProject,type ProjectMemory} from "./project-memory";
import ImageStudio from "./image-studio";
import type { ImageReturnContext } from "./image-assets";
import ProjectAssetWorkspace from "./project-asset-workspace";
import FramePromptWorkspace from "./frame-prompt-workspace";
import {mergeReplicationAdoption,restoreProjectAnalyzer,restoreProjectReplication,type ReplicationWorkspaceAsset} from "./analyzer-replication-workspace";
import {createScriptRevisionId,ensureScriptRevision,scriptRevisionIdentity} from "./script-foundation";
import {resolveCanonicalProductContext} from "./product-context";

type Scene = { time: string; visual: string; line: string; edit: string };
type Script = { revisionId?: string; sourceCreativeBriefId?: string; sourceCreativeBriefRevisionId?: string; id?: number; title: string; product: string; language: string; country: string; style: string; hook: string; alternateHooks: string[]; narration: string; scenes: Scene[]; createdAt?: string; aiGenerated?: boolean; creativeAngle?:string; hookType?:string; framework?:string; conflict?:string; productReveal?:string; proof?:string; sellingPoints?:string; cta?:string; shootingSuggestion?:string; scenario?:string; proofMechanism?:string; ctaStyle?:string };
type ImportedHook = { url: string; market: string; hook: string; createdAt: string };
type MonitorAccount = { id?: number; handle: string; market: string; product: string; url: string };
type HookItem = { id: number; title: string; language: string; copy: string };
type SellingPointItem = { id: number; product: string; points: string };
type ProductProfile = { id:number; name:string; brand:string; category:string; sellingPoints:string; parameters:string; bannedWords:string; markets:string; audience:string; price:string; offer:string; notes:string; updatedAt:string };
type ReviewRecord = { id:number; title:string; product:string; scriptTitle:string; videoUrl:string; account:string; market:string; publishDate:string; views:string; likes:string; comments:string; shares:string; retention3s:string; completion:string; ctr:string; cvr:string; orders:string; gmv:string; notes:string; createdAt:string };
type BreakdownPart = { label: string; purpose: string; evidence: string };
type Breakdown = { score: number; hookType: string; hook: string; emotion: string; rhythm: string; proof: string; cta: string; strengths: string[]; risks: string[]; parts: BreakdownPart[]; formula: string };
type TeamPayload = { hooks?: HookItem[]; points?: SellingPointItem[]; products?: ProductProfile[]; reviews?: ReviewRecord[]; history?: Script[]; viralCases?:ViralCase[] };
type AdoptedDirectorContext={duration:number;offer:string};
function inferredScriptDuration(script:Script,fallback=30){const values=script.scenes.flatMap(scene=>scene.time.match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite);const end=values.length?Math.max(...values):fallback;return [15,20,30,45,60].reduce((best,value)=>Math.abs(value-end)<Math.abs(best-end)?value:best,30);}
const initialProviderStatuses:Record<ProviderId,ProviderStatus>={deepseek:{id:"deepseek",label:"DeepSeek",configured:false,state:"unconfigured",model:null,baseUrl:null,missingFields:["正在检查"]},doubao:{id:"doubao",label:"豆包",configured:false,state:"unconfigured",model:null,baseUrl:null,missingFields:["正在检查"]},openai:{id:"openai",label:"GPT",configured:false,state:"unconfigured",model:null,baseUrl:null,missingFields:["OpenAIProvider 尚未实现"]}};
const teamApi = "/api/team-data";
const languages = ["中文", "西班牙语", "意大利语", "德语", "英语"];
const styles = ["强冲突测评", "真实KOC种草", "悬念揭秘", "导演朋友的新玩具", "痛点解决"];
const starterHooks: HookItem[] = seedHooks;
const starterPoints: SellingPointItem[] = [{ id: 1, product: "变形金刚钢化膜", points: "10秒自动除尘安装；自动对位；无灰尘、无气泡、不贴歪；左右28°防窥；电镀疏水疏油层；不易残留指纹；抗刮耐磨、抗冲击；贴合紧密、不易翘边" }];
const starterProducts: ProductProfile[] = [{ id:1, name:"变形金刚钢化膜", brand:"Transformers", category:"手机配件 / 钢化膜", sellingPoints:"10秒自动除尘安装；自动对位；无灰尘、无气泡、不贴歪；左右28°防窥；电镀疏水疏油层；抗刮耐磨、抗冲击；贴合紧密、不易翘边", parameters:"左右28°防窥；兼容主流手机壳；一盒两片膜；附带清洁工具", bannedWords:"100%防爆；永不碎；绝对防摔；全网第一；砸不坏", markets:"西班牙、意大利、美国、英国", audience:"经常自己贴坏钢化膜、在意隐私的手机用户", price:"按对应国家商品页面填写", offer:"库存有限；买一份到手两张膜；现在下单加赠镜头保护膜", notes:"危险测试需在受控环境进行，字幕避免绝对化承诺。", updatedAt:new Date(0).toISOString() }];
const metric = (value:string) => Number.parseFloat(value) || 0;
function diagnoseReview(item:ReviewRecord) { const issues:string[] = []; const actions:string[] = []; if (metric(item.retention3s) < 65) { issues.push("开头留人不足"); actions.push("重做前3秒：结果前置、强化冲突或直接展示异常画面"); } if (metric(item.completion) < 25) { issues.push("中段掉人明显"); actions.push("压缩铺垫，每1–2秒安排动作或信息变化，提前展示核心结果"); } if (metric(item.ctr) < 2) { issues.push("商品点击偏低"); actions.push("强化产品出现频率、购买理由和自然CTA，确保价格利益点清晰"); } if (metric(item.cvr) < 2) { issues.push("点击后成交偏低"); actions.push("核对商品页、价格、信任证明和受众匹配，减少夸张承诺"); } if (!issues.length) { issues.push("数据链路表现健康"); actions.push("保留当前钩子与卖点顺序，换场景、机位和表达继续放大"); } const score = Math.max(0,Math.min(100,Math.round(metric(item.retention3s)*.35 + metric(item.completion)*.7 + metric(item.ctr)*4 + metric(item.cvr)*5))); return { issues, actions, score }; }
function splitCopy(text: string) { return text.replace(/\r/g, "").split(/(?<=[。！？!?；;])|\n+/).map(x => x.trim()).filter(Boolean); }
function analyzeViralCopy(text: string): Breakdown {
  const lines = splitCopy(text); const hook = lines[0]?.slice(0, 160) || text.slice(0, 160);
  const hasConflict = /浪费|垃圾|别买|不要买|骗局|错了|失败|普通|versus|contra|no compres|dinero|basura/i.test(hook);
  const hasQuestion = /[?？]|为什么|猜|what|why|cómo|por qué|adivina/i.test(hook);
  const hasSuspense = /最后|看到最后|等等|接下来|没想到|居然|wait|final|espera|al final/i.test(hook);
  const hasNumber = /\d+|一秒|三步|三个|四个|秒|%|度/.test(hook);
  const hookType = hasConflict ? "冲突 / 反常识钩子" : hasQuestion ? "提问 / 好奇钩子" : hasSuspense ? "悬念 / 延迟揭晓钩子" : hasNumber ? "数字 / 结果承诺钩子" : "场景 / 新奇事物钩子";
  const demoIndex = lines.findIndex(x => /安装|打开|取出|擦|对准|滑|按|测试|砸|刮|步骤|instal|coloca|desliza|prueba|test/i.test(x));
  const proofIndex = lines.findIndex(x => /结果|无气泡|灰尘|防窥|兼容|抗|层|表面|指纹|result|burbuja|polvo|privacidad|compatible|resisten/i.test(x));
  const ctaIndex = lines.findIndex(x => /买|下单|链接|库存|优惠|售罄|购买|buy|compra|enlace|stock|oferta/i.test(x));
  const slice = (start: number, end: number) => lines.slice(Math.max(0,start), Math.max(start + 1,end)).join(" ").slice(0, 220) || "原文未明显表达";
  const introEnd = demoIndex > 0 ? demoIndex : Math.min(2, lines.length);
  const proofStart = proofIndex >= 0 ? proofIndex : Math.max(introEnd, lines.length - 2);
  const ctaStart = ctaIndex >= 0 ? ctaIndex : Math.max(proofStart + 1, lines.length - 1);
  const parts: BreakdownPart[] = [
    { label: "前3秒钩子", purpose: "制造停留，让观众立刻想知道结果", evidence: hook },
    { label: "问题与铺垫", purpose: "放大旧方法的问题，建立观看理由", evidence: slice(1, introEnd) },
    { label: "过程演示", purpose: "用动作推进内容，降低广告感", evidence: slice(introEnd, proofStart) },
    { label: "卖点与证明", purpose: "让功能通过结果被看见，而不是只口头宣称", evidence: slice(proofStart, ctaStart) },
    { label: "转化收口", purpose: "给观众明确的下一步行动", evidence: slice(ctaStart, lines.length) },
  ];
  const emotions = [hasConflict && "冲突感", hasSuspense && "好奇感", /省|简单|容易|快速|秒|easy|fácil|rápid/i.test(text) && "爽感", /钱|浪费|贵|dinero|precio/i.test(text) && "损失厌恶"].filter(Boolean) as string[];
  const risks = checkCompliance(text).slice(0, 4).map(x => `${x.category}：${x.term}`);
  const strengths = [hasConflict ? "开头有明确对立，容易打断滑动" : "开头直接进入主题，没有冗长铺垫", demoIndex >= 0 ? "用操作过程承接卖点，画面可拍性强" : "信息表达集中，适合补充动作演示", proofIndex >= 0 ? "有结果或功能证明，能建立信任" : "可加入对比结果，提高可信度", ctaIndex >= 0 ? "结尾有行动指令，转化路径完整" : "结尾可补充自然促单，提高转化" ];
  const score = Math.min(96, 55 + (hasConflict || hasQuestion || hasSuspense ? 12 : 5) + (demoIndex >= 0 ? 10 : 3) + (proofIndex >= 0 ? 10 : 2) + (ctaIndex >= 0 ? 8 : 1) - risks.length * 2);
  return { score, hookType, hook, emotion: emotions.join("＋") || "新奇感", rhythm: lines.length >= 8 ? "快节奏：短句连续推进，适合1–2秒切镜" : lines.length >= 4 ? "中快节奏：每个信息点配一个画面动作" : "信息较短：建议补充演示和结果镜头", proof: proofIndex >= 0 ? lines[proofIndex] : "原文证明不足，建议加入实拍结果或同条件对比", cta: ctaIndex >= 0 ? lines[ctaIndex] : "原文缺少明确收口，可补充自然的购买理由", strengths, risks: risks.length ? risks : ["暂未命中已知高风险词，仍需检查画面与促销真实性"], parts, formula: `${hookType.replace("钩子", "")} → 旧方法痛点 → 连续动作演示 → 结果证明 → 自然促单` };
}
function scoreScript(script: Script) { const risks = checkCompliance(script.narration).length; const hook = script.hook.length >= 8 && script.hook.length <= 90 ? 25 : 17; const structure = Math.min(25, 12 + script.scenes.length * 2); const proof = /测试|对比|实测|test|prueba|probar/i.test(script.narration) ? 22 : 14; const conversion = /链接|下单|购买|库存|click|compra|enlace/i.test(script.narration) ? 20 : 12; return { total: Math.max(0, hook + structure + proof + conversion - risks * 4), hook, structure, proof, conversion, risks }; }
function saferCopy(text: string) { const rules: [RegExp,string][] = [[/绝对不会|百分之百|100%|永久/gi,"在正常使用条件下不易"],[/全网第一|最强|顶级|唯一/gi,"表现突出"],[/保证|一定能|必然/gi,"有助于"],[/完全防爆|砸不坏|摔不坏/gi,"提升日常抗冲击能力"],[/最后一天|仅剩最后|马上售罄/gi,"库存与活动以页面显示为准"]]; return rules.reduce((copy,[pattern,replacement]) => copy.replace(pattern,replacement), text); }
const initialMonitorAccounts: MonitorAccount[] = [
  { handle: "@magicjohn.official", market: "全球", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn.official" },
  { handle: "@magicjohn_official.us3", market: "美国", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.us3" },
  { handle: "@magicjohn_official.spain", market: "西班牙", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.spain" },
  { handle: "@magic.john.it", market: "意大利", product: "钢化膜", url: "https://www.tiktok.com/@magic.john.it" },
  { handle: "@magicjohn.mex", market: "墨西哥", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn.mex" },
  { handle: "@magicjohn_official.uk", market: "英国", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.uk" },
  { handle: "@magicjohn_official.us6", market: "美国", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.us6" },
  { handle: "@magicjohn_official.uk5", market: "英国", product: "钢化膜", url: "https://www.tiktok.com/@magicjohn_official.uk5" },
];

export default function Home() {
  const [active, setActive] = useState<ActiveView>("dashboard");
  const [selectedProjectKey,setSelectedProjectKey]=useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [aiConnected, setAiConnected] = useState(false);
  const [providerStatuses,setProviderStatuses]=useState(initialProviderStatuses);
  const [selectedProvider,setSelectedProvider]=useState<ProviderId>("doubao");
  const [lastProviderRun,setLastProviderRun]=useState<ProviderRunMetadata|null>(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Script[]>([]);
  const [result, setResult] = useState<Script | null>(null);
  const [adoptedDirectorContext,setAdoptedDirectorContext]=useState<AdoptedDirectorContext>({duration:30,offer:""});
  const [directorSourceType,setDirectorSourceType]=useState<DirectorSourceType>("script-studio");
  const [raceResults, setRaceResults] = useState<Script[]>([]);
  const [raceLoading, setRaceLoading] = useState(false);
  const [referenceScript, setReferenceScript] = useState("");
  const [replicationCase,setReplicationCase]=useState<ViralCase|null>(null);
  const [breakdownText, setBreakdownText] = useState("");
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [libraryType, setLibraryType] = useState<"hooks" | "points" | "cases">("hooks");
  const [viralCases,setViralCases]=useState<ViralCase[]>(()=>{if(typeof window==="undefined")return [];try{const current=adaptLegacyCases(JSON.parse(localStorage.getItem("viralflow-viral-cases-v1")||"[]"));const legacy=adaptLegacyCases(JSON.parse(localStorage.getItem("susu-video-analysis-v1")||"[]"));const ids=new Set(current.map(x=>x.id));return [...current,...legacy.filter(x=>!ids.has(x.id))];}catch{return [];}});
  const [hookLibrary, setHookLibrary] = useState<HookItem[]>(() => { if (typeof window === "undefined") return starterHooks; try { const saved = JSON.parse(localStorage.getItem("susu-hook-library") || "null"); if (!Array.isArray(saved)) return starterHooks; const savedIds = new Set(saved.map((item:HookItem) => item.id)); return [...saved, ...starterHooks.filter(item => !savedIds.has(item.id))]; } catch { return starterHooks; } });
  const [pointLibrary, setPointLibrary] = useState<SellingPointItem[]>(() => { if (typeof window === "undefined") return starterPoints; try { const saved = JSON.parse(localStorage.getItem("susu-point-library") || "null"); return Array.isArray(saved) ? saved : starterPoints; } catch { return starterPoints; } });
  const [productProfiles, setProductProfiles] = useState<ProductProfile[]>(() => { if (typeof window === "undefined") return starterProducts; try { const saved = JSON.parse(localStorage.getItem("susu-product-center") || "null"); return Array.isArray(saved) && saved.length ? saved : starterProducts; } catch { return starterProducts; } });
  const [selectedProductId,setSelectedProductId] = useState<number|null>(null);
  const emptyProductDraft = { name:"", brand:"", category:"", sellingPoints:"", parameters:"", bannedWords:"", markets:"西班牙", audience:"", price:"", offer:"", notes:"" };
  const [productDraft, setProductDraft] = useState(emptyProductDraft);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const emptyReviewDraft = { title:"", product:"变形金刚钢化膜", scriptTitle:"", videoUrl:"", account:"", market:"西班牙", publishDate:new Date().toISOString().slice(0,10), views:"", likes:"", comments:"", shares:"", retention3s:"", completion:"", ctr:"", cvr:"", orders:"", gmv:"", notes:"" };
  const [reviewRecords, setReviewRecords] = useState<ReviewRecord[]>(() => { if (typeof window === "undefined") return []; try { const saved = JSON.parse(localStorage.getItem("susu-publish-reviews") || "[]"); return Array.isArray(saved) ? saved : []; } catch { return []; } });
  const [reviewDraft, setReviewDraft] = useState(emptyReviewDraft);
  const [reviewSearch, setReviewSearch] = useState("");
  const [hookDraft, setHookDraft] = useState({ title: "", language: "中文", copy: "" });
  const [pointDraft, setPointDraft] = useState({ product: "", points: "" });
  const [librarySearch, setLibrarySearch] = useState("");
  const [checkText, setCheckText] = useState("");
  const [hasChecked, setHasChecked] = useState(false);
  const [riskFilter, setRiskFilter] = useState<"全部" | "高" | "中" | "低">("全部");
  const [importForm, setImportForm] = useState({ url: "", market: "西班牙", hook: "" });
  const [importedHooks, setImportedHooks] = useState<ImportedHook[]>([]);
  const [monitorAccounts, setMonitorAccounts] = useState<MonitorAccount[]>(initialMonitorAccounts);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [showTeamLogin, setShowTeamLogin] = useState(false);
  const [teamPassword, setTeamPassword] = useState("");
  const [teamConnected, setTeamConnected] = useState(false);
  const [teamBusy, setTeamBusy] = useState(false);
  const [teamError, setTeamError] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountForm, setAccountForm] = useState({ url: "", market: "西班牙", product: "钢化膜" });
  const [form, setForm] = useState({ product: "变形金刚钢化膜", sellingPoints: "10秒自动除尘安装；无气泡、不歪；28°防窥；表层电镀疏水疏油层；抗刮耐磨、抗冲击；贴合紧密、不易翘边", audience: "经常自己贴坏钢化膜、在意隐私的手机用户", country: "西班牙", language: "西班牙语", style: "强冲突测评", framework: "智能随机", duration: "45", offer: "库存有限；买一份到手两张膜；现在下单加赠镜头保护膜" });
  const memoryReady=useRef(false);
  const [memorySaveState,setMemorySaveState]=useState<"saved"|"saving">("saved");
  const [projectMemory,setProjectMemory]=useState<ProjectMemory>(()=>({
    version:1,
    projects:demoProjects.map((item,index)=>({id:item.key,name:item.projectName,product:item.product,market:item.market||"",platform:item.platform||"TikTok",language:item.language||"",stage:item.stage,createdAt:new Date(Date.parse(item.updatedAt||"")-index*86400000).toISOString(),updatedAt:item.updatedAt||new Date().toISOString(),status:item.status,progress:item.progress,owner:item.owner,assets:{scriptVersions:index===0?demoScriptVariations:[]}})),
    workspace:{activeView:"dashboard",currentProjectId:demoProjects[0]?.key||null},
    updatedAt:demoProjects[0]?.updatedAt||new Date(0).toISOString(),
  }));
  const inputReady = useMemo(() => Boolean(form.product.trim() && form.sellingPoints.trim() && (active !== "replicate" || referenceScript.trim().length >= 30)), [form, active, referenceScript]);
  const complianceHits = useMemo(() => hasChecked ? checkCompliance(checkText) : [], [checkText, hasChecked]);
  const visibleComplianceHits = useMemo(() => riskFilter === "全部" ? complianceHits : complianceHits.filter(hit => hit.level === riskFilter), [complianceHits, riskFilter]);
  const reviewStats = useMemo(() => { const count = reviewRecords.length || 1; return { views:reviewRecords.reduce((sum,x)=>sum+metric(x.views),0), orders:reviewRecords.reduce((sum,x)=>sum+metric(x.orders),0), gmv:reviewRecords.reduce((sum,x)=>sum+metric(x.gmv),0), retention:reviewRecords.reduce((sum,x)=>sum+metric(x.retention3s),0)/count, completion:reviewRecords.reduce((sum,x)=>sum+metric(x.completion),0)/count, ctr:reviewRecords.reduce((sum,x)=>sum+metric(x.ctr),0)/count, cvr:reviewRecords.reduce((sum,x)=>sum+metric(x.cvr),0)/count }; }, [reviewRecords]);

  async function loadHistory() {
    try { const saved = JSON.parse(localStorage.getItem("viralcraft-history") || "[]"); setHistory(saved); const res = await fetch("/api/scripts", { cache: "no-store" }); const data = await res.json(); if (res.ok){setAiConnected(Boolean(data.aiConnected));if(data.providers)setProviderStatuses(data.providers);} }
    catch { setError("历史记录暂时加载失败，请稍后再试。"); }
  }
  useEffect(() => {
    fetch("/api/scripts", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { setHistory(JSON.parse(localStorage.getItem("viralcraft-history") || "[]")); setAiConnected(Boolean(data.aiConnected));if(data.providers)setProviderStatuses(data.providers); })
      .catch(() => setError("历史记录暂时加载失败，请稍后再试。"));
    fetch("/api/monitor/accounts", { cache: "no-store" })
      .then(res => res.json())
      .then(data => { if (data.accounts) setMonitorAccounts(data.accounts); })
      .catch(() => undefined);
  }, []);

  useEffect(()=>{
    const local=readProjectMemory();
    const hydrate=(memory:ProjectMemory)=>{
      setProjectMemory(memory);
      const snapshot=memory.workspace;
      const project=memory.projects.find(item=>item.id===snapshot.currentProjectId);
      const restored=restoreProjectScriptState(project,snapshot);
      if(snapshot.form)setForm(previous=>({...previous,...snapshot.form,...(project?{product:project.product,country:project.market,language:project.language}:{} )}));
      setResult((restored.currentScript||(DATA_MODE==="demo"&&project?.id===demoProjects[0]?.key?demoScript:null)) as Script|null);
      setRaceResults((restored.raceResults.length?restored.raceResults:(DATA_MODE==="demo"&&project?.id===demoProjects[0]?.key?demoScriptVariations:[])) as Script[]);
      if(typeof snapshot.referenceScript==="string")setReferenceScript(snapshot.referenceScript);
      if(snapshot.directorContext){setAdoptedDirectorContext({duration:snapshot.directorContext.duration,offer:snapshot.directorContext.offer});setDirectorSourceType(snapshot.directorContext.sourceType as DirectorSourceType);}
      setSelectedProjectKey(snapshot.currentProjectId);
      setSelectedProductId(project?.productProfileId??productProfiles.find(item=>item.name.trim().toLowerCase()===project?.product.trim().toLowerCase())?.id??null);
      setActive(snapshot.activeView||"dashboard");
    };
    if(local)hydrate(local);
    fetch("/api/project-memory",{cache:"no-store"}).then(response=>response.ok?response.json():Promise.reject()).then(data=>{if(data.memory)hydrate(data.memory as ProjectMemory);}).catch(()=>undefined).finally(()=>{memoryReady.current=true;});
  },[]);

  useEffect(()=>{
    if(!memoryReady.current)return;
    const project=projectMemory.projects.find(item=>item.id===projectMemory.workspace.currentProjectId);
    setReplicationCase(null);
    const restored=restoreProjectScriptState(project,projectMemory.workspace);
    const demo=DATA_MODE==="demo"&&project?.id===demoProjects[0]?.key;
    setResult((restored.currentScript||(demo?demoScript:null)) as Script|null);
    setRaceResults((restored.raceResults.length?restored.raceResults:(demo?demoScriptVariations:[])) as Script[]);
    if(project)setForm(previous=>({...previous,product:project.product,country:project.market,language:project.language}));
    setSelectedProductId(project?.productProfileId??productProfiles.find(item=>item.name.trim().toLowerCase()===project?.product.trim().toLowerCase())?.id??null);
  },[projectMemory.workspace.currentProjectId]);

  useEffect(()=>{
    if(!memoryReady.current)return;
    setMemorySaveState("saving");
    cacheProjectMemory(projectMemory);
    const timer=window.setTimeout(()=>{void fetch("/api/project-memory",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(projectMemory)}).finally(()=>setMemorySaveState("saved"));},450);
    return()=>window.clearTimeout(timer);
  },[projectMemory]);

  function updateProjectMemory(assetPatch:Partial<PersistentProject["assets"]>,projectPatch:Partial<PersistentProject>={}){
    setProjectMemory(current=>{
      const currentId=current.workspace.currentProjectId||current.projects[0]?.id||null;
      const projects=current.projects.map(project=>project.id===currentId?touchProject(project,{...projectPatch,assets:{...project.assets,...assetPatch}}):project);
      return{...current,projects,updatedAt:new Date().toISOString()};
    });
  }
  function saveWorkspaceSnapshot(patch:Partial<ProjectMemory["workspace"]>){setProjectMemory(current=>({...current,workspace:{...current.workspace,...patch},updatedAt:new Date().toISOString()}));}
  function returnToFramePrompt(context:ImageReturnContext){
    setProjectMemory(current=>{
      const projects=current.projects.map(project=>{
        if(project.id!==context.projectId)return project;
        const directorResult=project.assets.directorResult;
        if(!directorResult||typeof directorResult!=="object")return project;
        const workspace=directorResult as {shots?:Array<{shotId?:string}>;selectedShot?:number};
        const requestedIndex=workspace.shots?.findIndex(shot=>shot.shotId===context.shotId)??-1;
        const selectedShot=requestedIndex>=0?requestedIndex:typeof workspace.selectedShot==="number"?workspace.selectedShot:0;
        return touchProject(project,{assets:{...project.assets,directorResult:{...workspace,selectedShot}}});
      });
      return {...current,projects,workspace:{...current.workspace,currentProjectId:context.projectId,activeView:"frames"},updatedAt:new Date().toISOString()};
    });
    setSelectedProjectKey(context.projectId);
    setActive("frames");
  }
  function createProject(input:{name:string;product:string;market:string;platform:string;language:string}){
    const now=new Date().toISOString();const id=`project-${Date.now()}`;
    const project:PersistentProject={id,name:input.name.trim(),product:input.product.trim(),market:input.market.trim(),platform:input.platform,language:input.language,stage:"洞察",createdAt:now,updatedAt:now,status:"创作中",progress:0,owner:"苏苏",assets:{scriptVersions:[]}};
    setProjectMemory(current=>({...current,projects:[project,...current.projects],workspace:{...current.workspace,currentProjectId:id,activeView:"projects"},updatedAt:now}));setSelectedProjectKey(id);
  }
  function renameProject(id:string,name:string){setProjectMemory(current=>({...current,projects:current.projects.map(project=>project.id===id?touchProject(project,{name:name.trim()}):project),updatedAt:new Date().toISOString()}));}
  function duplicateProject(id:string){const copyId=`project-${Date.now()}`;setProjectMemory(current=>{const source=current.projects.find(project=>project.id===id);if(!source)return current;const now=new Date().toISOString();const copy:PersistentProject={...source,id:copyId,name:`${source.name} 副本`,createdAt:now,updatedAt:now,assets:{...source.assets,scriptVersions:[...source.assets.scriptVersions]}};return{...current,projects:[copy,...current.projects],workspace:{...current.workspace,currentProjectId:copy.id,activeView:"projects"},updatedAt:now};});setSelectedProjectKey(copyId);}
  function deleteProject(id:string){setProjectMemory(current=>{const projects=current.projects.filter(project=>project.id!==id);const nextId=current.workspace.currentProjectId===id?projects[0]?.id||null:current.workspace.currentProjectId;return{...current,projects,workspace:{...current.workspace,currentProjectId:nextId},updatedAt:new Date().toISOString()};});setSelectedProjectKey(null);}

  async function syncTeam(payload: TeamPayload) {
    if (!teamConnected || !teamPassword) return;
    await fetch(teamApi, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: teamPassword, action: "save", payload }) });
  }
  function currentTeamPayload(overrides: TeamPayload = {}): TeamPayload { return { hooks: hookLibrary, points: pointLibrary, products: productProfiles, reviews: reviewRecords, history, viralCases, ...overrides }; }
  async function connectTeam() {
    if (!teamPassword || teamBusy) return;
    setTeamBusy(true); setTeamError("");
    try {
      const res = await fetch(teamApi, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: teamPassword, action: "load" }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || "连接失败");
      const cloud = (data.payload || {}) as TeamPayload;
      const hooks = cloud.hooks?.length ? [...cloud.hooks, ...starterHooks.filter(seed => !cloud.hooks!.some(x => x.id === seed.id))] : hookLibrary;
      const points = cloud.points?.length ? cloud.points : pointLibrary;
      const products = cloud.products?.length ? cloud.products : productProfiles;
      const reviews = cloud.reviews?.length ? cloud.reviews : reviewRecords;
      const scripts = cloud.history?.length ? cloud.history : history;
      const cases=cloud.viralCases?.length?adaptLegacyCases(cloud.viralCases):viralCases;
      setHookLibrary(hooks); setPointLibrary(points); setProductProfiles(products); setReviewRecords(reviews); setHistory(scripts); setViralCases(cases); setTeamConnected(true); setShowTeamLogin(false);
      localStorage.setItem("susu-hook-library", JSON.stringify(hooks)); localStorage.setItem("susu-point-library", JSON.stringify(points)); localStorage.setItem("susu-product-center", JSON.stringify(products)); localStorage.setItem("susu-publish-reviews", JSON.stringify(reviews)); localStorage.setItem("viralcraft-history", JSON.stringify(scripts));localStorage.setItem("viralflow-viral-cases-v1",JSON.stringify(cases));
      if (!data.payload) await fetch(teamApi, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: teamPassword, action: "save", payload: { hooks, points, products, reviews, history: scripts, viralCases: cases } }) });
    } catch (e) { setTeamError(e instanceof Error ? e.message : "连接失败"); }
    finally { setTeamBusy(false); }
  }
  function saveHooks(items: HookItem[]) { setHookLibrary(items); localStorage.setItem("susu-hook-library", JSON.stringify(items)); void syncTeam(currentTeamPayload({ hooks: items })); }
  function savePoints(items: SellingPointItem[]) { setPointLibrary(items); localStorage.setItem("susu-point-library", JSON.stringify(items)); void syncTeam(currentTeamPayload({ points: items })); }
  function saveProducts(items: ProductProfile[]) { setProductProfiles(items); localStorage.setItem("susu-product-center", JSON.stringify(items)); void syncTeam(currentTeamPayload({ products: items })); }
  function saveReviews(items: ReviewRecord[]) { setReviewRecords(items); localStorage.setItem("susu-publish-reviews", JSON.stringify(items)); void syncTeam(currentTeamPayload({ reviews: items })); }
  function saveViralCases(items:ViralCase[]){setViralCases(items);localStorage.setItem("viralflow-viral-cases-v1",JSON.stringify(items));void syncTeam(currentTeamPayload({viralCases:items}));}
  function replicateViralCase(item:ViralCase){const reference=viralCaseReference(item);setReplicationCase(item);setReferenceScript(reference);setActive("replicate");updateProjectMemory({analyzerResult:item,replicationResult:{sourceId:item.id,source:item}},{stage:"复刻",progress:30});saveWorkspaceSnapshot({activeView:"replicate",referenceScript:reference});}
  function adoptCurrentScript(script:Script,context:AdoptedDirectorContext){const adopted=ensureScriptRevision(script);setResult(adopted);setAdoptedDirectorContext(context);updateProjectMemory({scriptVersions:[...((projectMemory.projects.find(x=>x.id===projectMemory.workspace.currentProjectId)?.assets.scriptVersions||[]).filter(item=>scriptRevisionIdentity(item as Script)!==adopted.revisionId)),adopted]},{stage:"脚本",progress:55});saveWorkspaceSnapshot({currentScript:adopted,directorContext:{...context,sourceType:directorSourceType}});return adopted;}
  function adoptReplication(script:StructuredScript,reference:string,setup:ReplicationSetup,candidate:import("./replication-core").ReplicationCandidate,workspace:ReplicationWorkspaceAsset,next:"create"|"director"="create"){const generated=script as Script;const adopted=ensureScriptRevision({...script,product:generated.product||form.product,language:generated.language||setup.language,country:generated.country||setup.market,style:script.style||form.style,alternateHooks:generated.alternateHooks||[],scenes:script.scenes||[],sourceCaseReference:reference} as Script);const nextForm={...form,product:adopted.product,language:adopted.language,country:adopted.country,duration:setup.duration};const currentProject=projectMemory.projects.find(x=>x.id===projectMemory.workspace.currentProjectId);const mergedReplication=mergeReplicationAdoption(currentProject?.assets.replicationResult,workspace,candidate,adopted as StructuredScript,reference,setup);setForm(nextForm);setReferenceScript(reference);setResult(adopted);setAdoptedDirectorContext({duration:Number(setup.duration)||30,offer:""});setRaceResults([]);setDirectorSourceType("viral-replication");setActive(next);updateProjectMemory({replicationResult:mergedReplication,scriptVersions:[...currentProject?.assets.scriptVersions||[],adopted]},{stage:next==="director"?"导演":"脚本",progress:next==="director"?68:55});saveWorkspaceSnapshot({activeView:next,currentScript:adopted,raceResults:[],referenceScript:reference,form:nextForm,directorContext:{duration:Number(setup.duration)||30,offer:"",sourceType:"viral-replication"}});}
  function addHookItem() { if (!hookDraft.title.trim() || !hookDraft.copy.trim()) return; saveHooks([{ id: Date.now(), title: hookDraft.title.trim(), language: hookDraft.language, copy: hookDraft.copy.trim() }, ...hookLibrary]); setHookDraft({ title: "", language: "中文", copy: "" }); }
  function addPointItem() { if (!pointDraft.product.trim() || !pointDraft.points.trim()) return; savePoints([{ id: Date.now(), product: pointDraft.product.trim(), points: pointDraft.points.trim() }, ...pointLibrary]); setPointDraft({ product: "", points: "" }); }
  function saveProductProfile() { if (!productDraft.name.trim() || !productDraft.sellingPoints.trim()) return; const item:ProductProfile = { id:editingProductId ?? Date.now(), ...productDraft, updatedAt:new Date().toISOString() }; saveProducts(editingProductId ? productProfiles.map(x => x.id === editingProductId ? item : x) : [item, ...productProfiles]); setEditingProductId(null); setProductDraft(emptyProductDraft); }
  function editProductProfile(item:ProductProfile) { const { id, updatedAt, ...draft } = item; void updatedAt; setEditingProductId(id); setProductDraft(draft); }
  function applyProductProfile(item:ProductProfile) { setSelectedProductId(item.id); updateProjectMemory({}, {product:item.name,productProfileId:item.id}); setForm(prev => ({ ...prev, product:item.name, sellingPoints:[item.sellingPoints,item.parameters].filter(Boolean).join("；"), audience:item.audience || prev.audience, country:item.markets.split(/[、,，]/)[0]?.trim() || prev.country, offer:[item.offer,item.price].filter(Boolean).join("；") || prev.offer })); setActive("create"); }
  function addReviewRecord() { if (!reviewDraft.title.trim() || !reviewDraft.product.trim()) return; const item:ReviewRecord = { id:Date.now(), ...reviewDraft, createdAt:new Date().toISOString() }; saveReviews([item,...reviewRecords]); setReviewDraft(emptyReviewDraft); }

  async function addMonitorAccount() {
    if (accountSaving) return;
    setAccountSaving(true); setAccountError("");
    try {
      const res = await fetch("/api/monitor/accounts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(accountForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "账号添加失败");
      setMonitorAccounts(prev => [...prev, data.account]);
      setAccountForm({ url: "", market: "西班牙", product: "钢化膜" });
      setShowAddAccount(false);
    } catch (e) { setAccountError(e instanceof Error ? e.message : "账号添加失败"); }
    finally { setAccountSaving(false); }
  }

  function currentProductContext(productName=form.product){
    const project=projectMemory.projects.find(item=>item.id===projectMemory.workspace.currentProjectId);
    return resolveCanonicalProductContext({productName,selectedProductId,projectProductProfileId:project?.productProfileId,profiles:productProfiles});
  }

  async function generate(controls:GenerationControls) {
    if (!inputReady || loading) return;
    setLoading(true); setError("");
    try {
      const recent = history.filter(item => item.product === form.product && item.language === form.language).slice(0, 6).map(({title,hook,narration,creativeAngle,scenario,proofMechanism,cta,product,language}) => ({title,hook,narration,creativeAngle,scenario,proofMechanism,cta,product,language}));
      const productKnowledge=currentProductContext().productKnowledge;
      const sellingPointKnowledge=pointLibrary.filter(item=>item.product.trim().toLowerCase()===form.product.trim().toLowerCase());
      const res = await fetch("/api/scripts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, ...controls, outputCount:1, projectId:projectMemory.workspace.currentProjectId, productKnowledge, sellingPointKnowledge, referenceScript: referenceScript || undefined, recent, nonce: Date.now() + Math.random() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "生成失败");
      if(data.provider)setLastProviderRun(data.provider);
      const adopted=adoptCurrentScript(data.script,{duration:Number(form.duration)||30,offer:form.offer}); const nextHistory = [adopted, ...history].slice(0, 100); setHistory(nextHistory); localStorage.setItem("viralcraft-history", JSON.stringify(nextHistory)); void syncTeam(currentTeamPayload({ history: nextHistory }));saveWorkspaceSnapshot({activeView:"create",form,currentScript:adopted,raceResults:[]});
    } catch (e) { setError(e instanceof Error ? e.message : "生成失败，请重试。"); }
    finally { setLoading(false); }
  }
  async function generateRace(controls:GenerationControls) {
    if (!inputReady || raceLoading) return;
    setRaceLoading(true); setError("");
    try {
      const recent = history.filter(item=>item.product===form.product&&item.language===form.language).slice(0,6).map(({title,hook,narration,creativeAngle,scenario,proofMechanism,cta,product,language}) => ({title,hook,narration,creativeAngle,scenario,proofMechanism,cta,product,language}));
      const productKnowledge=currentProductContext().productKnowledge;
      const sellingPointKnowledge=pointLibrary.filter(item=>item.product.trim().toLowerCase()===form.product.trim().toLowerCase());
      const res=await fetch("/api/scripts",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...form,...controls,outputCount:5,projectId:projectMemory.workspace.currentProjectId,productKnowledge,sellingPointKnowledge,referenceScript:referenceScript||undefined,recent,nonce:Date.now()+Math.random()})});
      const data=await res.json(); if(!res.ok)throw new Error(data.error||"生成失败");
      if(data.providerRuns?.[0])setLastProviderRun(data.providerRuns[0]);
      const scripts=((data.scripts || (data.script?[data.script]:[])) as Script[]).map(script=>ensureScriptRevision(script)); if(scripts.length!==5)throw new Error("赛马生成结果不完整");
      const nextHistory = [...scripts, ...history].slice(0, 100);
      setRaceResults(scripts); adoptCurrentScript(scripts[0],{duration:Number(form.duration)||30,offer:form.offer}); setHistory(nextHistory); localStorage.setItem("viralcraft-history", JSON.stringify(nextHistory)); void syncTeam(currentTeamPayload({ history: nextHistory }));updateProjectMemory({scriptVersions:[...projectMemory.projects.find(x=>x.id===projectMemory.workspace.currentProjectId)?.assets.scriptVersions||[],...scripts]},{stage:"脚本",progress:55});saveWorkspaceSnapshot({activeView:"create",form,currentScript:scripts[0],raceResults:scripts});
    } catch (e) { setError(e instanceof Error ? e.message : "赛马稿生成失败"); }
    finally { setRaceLoading(false); }
  }
  function update(key: keyof typeof form, value: string) { if(key==="product")updateProjectMemory({}, {product:value}); setForm(prev => {const next={...prev,[key]:value};saveWorkspaceSnapshot({form:next});return next;}); }
  function saveScriptVersion(script: Script) {
    const {id:_legacyId,revisionId:_previousRevision,...revisionSource}=script;
    void _legacyId;void _previousRevision;
    const saved: Script = {
      ...revisionSource,
      revisionId:createScriptRevisionId(),
      createdAt: new Date().toISOString(),
      title: `${script.title.replace(/ · V\d+$/, "")} · V${history.filter(item => item.title.startsWith(script.title.replace(/ · V\d+$/, ""))).length + 1}`,
    };
    const nextHistory = [saved, ...history].slice(0, 100);
    setHistory(nextHistory);
    localStorage.setItem("viralcraft-history", JSON.stringify(nextHistory));
    void syncTeam(currentTeamPayload({ history: nextHistory }));
    updateProjectMemory({scriptVersions:[...projectMemory.projects.find(x=>x.id===projectMemory.workspace.currentProjectId)?.assets.scriptVersions||[],saved]},{stage:"脚本",progress:55});
    saveWorkspaceSnapshot({currentScript:saved});
    return saved;
  }
  function copyText(text: string) { void navigator.clipboard.writeText(text).then(()=>notifyWorkspace("内容已复制")).catch(()=>notifyWorkspace("复制失败",{tone:"error",detail:"请检查浏览器剪贴板权限"})); }
  function importHook() {
    if (!importForm.url.trim() || !importForm.hook.trim()) {
      setError("请填写视频链接和前3–5秒开头文案。");
      return;
    }
    setImportedHooks(prev => [{ ...importForm, createdAt: new Date().toISOString() }, ...prev]);
    setImportForm(prev => ({ ...prev, url: "", hook: "" }));
    setError("");
  }
  function exportExcel(script: Script) {
    const rows = [["项目", "内容", "画面", "剪辑提示"], ["主钩子", script.hook, "", ""], ["备选钩子", script.alternateHooks.join(" / "), "", ""], ["完整口播", script.narration, "", ""], ...script.scenes.map(s => [s.time, s.line, s.visual, s.edit])];
    const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const xml = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="爆款脚本"><Table>${rows.map(r => `<Row>${r.map(c => `<Cell><Data ss:Type="String">${esc(c)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
    const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8" }); const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `${script.product}-${script.language}-脚本.xls`; a.click(); URL.revokeObjectURL(a.href); notifyWorkspace("脚本导出已开始",{detail:"文件使用当前真实脚本内容生成"});
  }

  const currentDirectorProject=projectMemory.projects.find(project=>project.id===projectMemory.workspace.currentProjectId);
  const directorProduct=currentProductContext(result?.product||form.product).productKnowledge;
  const currentAnalyzerCase=restoreProjectAnalyzer(currentDirectorProject);
  const currentReplicationWorkspace=restoreProjectReplication(currentDirectorProject);
  const currentReplicationSource=currentReplicationWorkspace?.source||currentAnalyzerCase||null;
  const persistentDirectorWorkspace=currentDirectorProject?.assets.directorResult;
  const directorInput:DirectorRequest|null=result?{projectId:currentDirectorProject?.id,scriptRevisionId:scriptRevisionIdentity(result),script:result as StructuredScript,context:{product:result.product||form.product,sellingPoints:result.sellingPoints||directorProduct?.sellingPoints||form.sellingPoints,audience:form.audience,market:result.country||form.country,language:result.language||form.language,platform:"TikTok",targetDuration:adoptedDirectorContext.duration,creativeMode:result.style||form.style,hookStrategy:result.hookType||"好奇",framework:result.framework||form.framework,creativeAngle:result.creativeAngle||"",offer:adoptedDirectorContext.offer,productKnowledge:directorProduct?{...directorProduct,offer:adoptedDirectorContext.offer}:undefined,sourceType:directorSourceType,...(directorSourceType==="viral-replication"?{replication:{sourceMechanism:result.creativeAngle||result.hookType||"",replicationStrategy:`${result.hookType||""} · ${result.framework||""}`,proofMapping:result.proof||"",sellingPointMapping:result.sellingPoints||""}}:{})},settings:{provider:"doubao"}}:null;
  const directorDisplayInput=directorInput||(DATA_MODE==="demo"?demoDirectorInput:null);
  const currentDirectorWorkspace=persistentDirectorWorkspace||(DATA_MODE==="demo"&&!result?demoDirectorWorkspace:undefined);

  const recentWork:RecentWorkItem[]=[
    ...(result?[{key:"current",title:result.title,product:result.product,market:result.country,language:result.language,platform:"TikTok",duration:adoptedDirectorContext.duration,updatedAt:result.createdAt,current:true}]:[]),
    ...history.filter(item=>!result||(item.id!==result.id&&item.title!==result.title&&item.narration!==result.narration)).slice(0,result?4:5).map(item=>({key:`history-${item.id??"none"}-${item.createdAt??item.title}`,title:item.title,product:item.product,market:item.country,language:item.language,platform:"TikTok",duration:inferredScriptDuration(item),updatedAt:item.createdAt,current:false})),
  ];
  const openRecent=(key:string,destination:"script"|"director")=>{
    const item=key==="current"?result:history.find(entry=>`history-${entry.id??"none"}-${entry.createdAt??entry.title}`===key);
    if(!item)return;
    const duration=key==="current"?adoptedDirectorContext.duration:inferredScriptDuration(item);
    adoptCurrentScript(item,{duration,offer:key==="current"?adoptedDirectorContext.offer:""});
    if(destination==="director")setDirectorSourceType(key==="current"?directorSourceType:"history");
    setActive(destination==="director"?"director":"create");
  };
  const featureSearchItems:GlobalSearchItem[]=Object.entries(viewMeta).map(([id,meta])=>({id:`feature-${id}`,type:"功能",title:meta.label,subtitle:meta.description,keywords:meta.eyebrow,onSelect:()=>setActive(id as ActiveView)}));
  const searchItems:GlobalSearchItem[]=[
    ...featureSearchItems,
    ...productProfiles.map(item=>({id:`product-${item.id}`,type:"产品" as const,title:item.name,subtitle:[item.brand,item.category,item.markets].filter(Boolean).join(" · ")||"产品知识库",keywords:`${item.sellingPoints} ${item.parameters}`,onSelect:()=>{setProductSearch(item.name);setActive("products");}})),
    ...viralCases.map(item=>({id:`case-${item.id}`,type:"案例" as const,title:item.title,subtitle:[item.source.platform,item.source.market,item.source.product].filter(Boolean).join(" · ")||"创意案例库",keywords:`${item.analysis.summary} ${item.analysis.creativeAngle}`,onSelect:()=>{setLibraryType("cases");setLibrarySearch(item.title);setActive("library");}})),
    ...history.map((item,index)=>({id:`script-${item.id??index}`,type:"脚本" as const,title:item.title,subtitle:`${item.product} · ${item.language}`,keywords:`${item.hook} ${item.country}`,onSelect:()=>{adoptCurrentScript(item,{duration:inferredScriptDuration(item),offer:""});setActive("create");}})),
  ];
  const realDashboardMetrics=buildDashboardMetrics({products:productProfiles,cases:viralCases,scripts:history,currentScript:result,recentCount:recentWork.length,providers:providerStatuses});
  const dashboardMetrics=DATA_MODE==="demo"?demoDashboardData:realDashboardMetrics;
  const persistentProjects:DemoProject[]=projectMemory.projects.map((project,index)=>{const counts={analysis:project.assets.analyzerResult?1:0,replication:project.assets.replicationResult?1:0,scripts:project.assets.scriptVersions.length,director:project.assets.directorResult?1:0,voice:project.assets.voiceResult?1:0,reviews:0};const type:DemoProject["type"]=project.stage==="导演"?"导演":project.stage==="语音"?"语音":project.stage==="洞察"||project.stage==="复刻"?"洞察":"脚本";return{key:project.id,projectName:project.name,title:(project.assets.scriptVersions.at(-1) as Script|undefined)?.title||project.name,product:project.product,market:project.market,language:project.language,platform:project.platform,duration:Number(projectMemory.workspace.form?.duration)||30,createdAt:project.createdAt,updatedAt:project.updatedAt,current:project.id===projectMemory.workspace.currentProjectId,type,status:(project.status as DemoProject["status"])||"创作中",stage:project.stage as DemoProject["stage"],nextAction:project.stage==="导演"?"完善 AI 导演方案":project.stage==="语音"?"继续 AI 语音":"继续创作",progress:project.progress??Math.min(95,20+Object.values(counts).reduce((sum,value)=>sum+value,0)*8),owner:project.owner||"苏苏",assets:counts};}).sort((a,b)=>Date.parse(b.updatedAt||"")-Date.parse(a.updatedAt||""));
  const demoRecent=DATA_MODE==="demo"?demoProjects:recentWork;
  const dashboardRecent=persistentProjects.length?persistentProjects:(DATA_MODE==="demo"?demoRecent:[]);
  const openProject=(key:string)=>{setSelectedProjectKey(key);setActive("projects");saveWorkspaceSnapshot({activeView:"projects",currentProjectId:key});};

  const projectMode=active==="brain"||active==="director"||active==="frames"||active==="create"||active==="breakdown"||active==="replicate"||active==="images"||active==="assets";
  return (<AppShell
    className={active === "frames" ? "vf-frame-mode" : ""}
    sidebar={<Sidebar active={active} onNavigate={view=>{if(view==="projects")setSelectedProjectKey(null);setActive(view);saveWorkspaceSnapshot({activeView:view});}} teamConnected={teamConnected} onTeamToggle={() => { if (teamConnected) { setTeamConnected(false); setTeamPassword(""); } else setShowTeamLogin(true); }} />}
    header={<TopHeader active={active} aiConnected={aiConnected} teamConnected={teamConnected} saveState={memorySaveState} searchItems={searchItems} project={projectMode?{name:currentDirectorProject?.name||result?.product||form.product,market:currentDirectorProject?.market||result?.country||form.country,platform:currentDirectorProject?.platform||"TikTok",language:currentDirectorProject?.language||result?.language||form.language}:null} />}
    workflow={projectMode?<WorkflowStepBar active={active} onNavigate={view=>{setActive(view);saveWorkspaceSnapshot({activeView:view});}}/>:null}
  >
      {active === "dashboard" && <Dashboard metrics={dashboardMetrics} recent={dashboardRecent} dataMode={DATA_MODE} onNavigate={setActive} onOpenRecent={openRecent} onOpenProject={openProject} />}
      {active === "brain" && <ProjectBrainWorkspace project={projectMemory.projects.find(item=>item.id===projectMemory.workspace.currentProjectId)} knowledge={currentProductContext(currentDirectorProject?.product||form.product).profile} reference={projectMemory.workspace.referenceScript} onEdit={()=>setActive("products")} />}
      {active === "projects" && <ProjectWorkspace projects={persistentProjects} initialProjectKey={selectedProjectKey} saveState={memorySaveState} onCreate={createProject} onRename={renameProject} onDuplicate={duplicateProject} onDelete={deleteProject} onSelect={id=>saveWorkspaceSnapshot({currentProjectId:id,activeView:"projects"})} onNavigate={view=>{setActive(view);saveWorkspaceSnapshot({activeView:view});}} />}
      {active === "images" && <ImageStudio projects={projectMemory.projects.map(project=>({id:project.id,name:project.name,product:project.product}))} currentProjectId={projectMemory.workspace.currentProjectId} onNavigate={view=>{setActive(view);saveWorkspaceSnapshot({activeView:view});}} onReturnToFrame={returnToFramePrompt} />}
      {active === "frames" && <FramePromptWorkspace project={currentDirectorProject||null} request={directorDisplayInput} workspace={currentDirectorWorkspace} scriptId={result?scriptRevisionIdentity(result):undefined} scriptVersion={result?.title||"当前脚本"} promptOverrides={currentDirectorProject?.assets.framePromptOverrides||[]} onPromptOverridesChange={records=>updateProjectMemory({framePromptOverrides:records})} onNavigate={view=>{setActive(view);saveWorkspaceSnapshot({activeView:view});}} onSelectShot={index=>{if(!currentDirectorWorkspace||typeof currentDirectorWorkspace!=="object")return;updateProjectMemory({directorResult:{...currentDirectorWorkspace,selectedShot:index}});saveWorkspaceSnapshot({activeView:"frames"});}} />}
      {active === "assets" && <ProjectAssetWorkspace mode="assets" projects={projectMemory.projects.map(project=>({id:project.id,name:project.name,product:project.product}))} currentProjectId={projectMemory.workspace.currentProjectId} onNavigate={view=>{setActive(view);saveWorkspaceSnapshot({activeView:view});}} />}
      {active === "video" && <VideoAnalyzer products={productProfiles.map(x=>x.name)} />}
      {active === "director" && <ShootingDirector input={directorDisplayInput} currentProjectId={projectMemory.workspace.currentProjectId} initialWorkspace={currentDirectorWorkspace} onNavigate={view=>setActive(view)} onChange={value=>{updateProjectMemory({directorResult:value},{stage:"导演",progress:72});saveWorkspaceSnapshot({activeView:"director"});}} />}
      {active === "voice" && <VoiceStudio initialText={result?.narration ?? ""} onChange={value=>{updateProjectMemory({voiceResult:value},{stage:"语音",progress:84});saveWorkspaceSnapshot({activeView:"voice"});}} />}
      {active === "reviews" && DATA_MODE==="demo" && <DataCenter mode={DATA_MODE} data={demoAnalytics} projects={persistentProjects}/>}
      {active === "reviews" && <section className="review-panel"><div className="review-dashboard"><article><span>累计播放</span><strong>{Math.round(reviewStats.views).toLocaleString()}</strong><small>{reviewRecords.length}条已发布视频</small></article><article><span>累计订单</span><strong>{Math.round(reviewStats.orders)}</strong><small>GMV {reviewStats.gmv.toLocaleString()}</small></article><article><span>平均3秒留存</span><strong>{reviewStats.retention.toFixed(1)}%</strong><small>建议目标 ≥65%</small></article><article><span>平均完播率</span><strong>{reviewStats.completion.toFixed(1)}%</strong><small>建议目标 ≥25%</small></article><article><span>平均点击率</span><strong>{reviewStats.ctr.toFixed(1)}%</strong><small>建议目标 ≥2%</small></article><article><span>平均转化率</span><strong>{reviewStats.cvr.toFixed(1)}%</strong><small>建议目标 ≥2%</small></article></div><div className="review-layout"><section className="review-form"><span className="modal-kicker">发布记录</span><h2>录入发布数据</h2><p>填写视频发布信息和关键指标，系统自动判断下一步优化方向。</p><label>复盘标题 *<input value={reviewDraft.title} onChange={e=>setReviewDraft(prev=>({...prev,title:e.target.value}))} placeholder="例如：西班牙斧头测试 V3" /></label><div className="review-two"><label>产品 *<select value={reviewDraft.product} onChange={e=>setReviewDraft(prev=>({...prev,product:e.target.value}))}>{productProfiles.map(x=><option key={x.id}>{x.name}</option>)}</select></label><label>关联脚本<select value={reviewDraft.scriptTitle} onChange={e=>setReviewDraft(prev=>({...prev,scriptTitle:e.target.value}))}><option value="">未关联</option>{history.map((x,index)=><option key={`${x.title}-${index}`}>{x.title}</option>)}</select></label></div><label>视频链接<input value={reviewDraft.videoUrl} onChange={e=>setReviewDraft(prev=>({...prev,videoUrl:e.target.value}))} placeholder="https://www.tiktok.com/@.../video/..." /></label><div className="review-three"><label>发布账号<input value={reviewDraft.account} onChange={e=>setReviewDraft(prev=>({...prev,account:e.target.value}))} placeholder="@username" /></label><label>市场<input value={reviewDraft.market} onChange={e=>setReviewDraft(prev=>({...prev,market:e.target.value}))} /></label><label>发布日期<input type="date" value={reviewDraft.publishDate} onChange={e=>setReviewDraft(prev=>({...prev,publishDate:e.target.value}))} /></label></div><div className="review-metrics"><label>播放量<input inputMode="numeric" value={reviewDraft.views} onChange={e=>setReviewDraft(prev=>({...prev,views:e.target.value}))} placeholder="0" /></label><label>点赞<input inputMode="numeric" value={reviewDraft.likes} onChange={e=>setReviewDraft(prev=>({...prev,likes:e.target.value}))} placeholder="0" /></label><label>评论<input inputMode="numeric" value={reviewDraft.comments} onChange={e=>setReviewDraft(prev=>({...prev,comments:e.target.value}))} placeholder="0" /></label><label>分享<input inputMode="numeric" value={reviewDraft.shares} onChange={e=>setReviewDraft(prev=>({...prev,shares:e.target.value}))} placeholder="0" /></label></div><div className="review-metrics"><label>3秒留存 %<input inputMode="decimal" value={reviewDraft.retention3s} onChange={e=>setReviewDraft(prev=>({...prev,retention3s:e.target.value}))} placeholder="65" /></label><label>完播率 %<input inputMode="decimal" value={reviewDraft.completion} onChange={e=>setReviewDraft(prev=>({...prev,completion:e.target.value}))} placeholder="25" /></label><label>点击率 %<input inputMode="decimal" value={reviewDraft.ctr} onChange={e=>setReviewDraft(prev=>({...prev,ctr:e.target.value}))} placeholder="2" /></label><label>转化率 %<input inputMode="decimal" value={reviewDraft.cvr} onChange={e=>setReviewDraft(prev=>({...prev,cvr:e.target.value}))} placeholder="2" /></label></div><div className="review-two"><label>订单数<input inputMode="numeric" value={reviewDraft.orders} onChange={e=>setReviewDraft(prev=>({...prev,orders:e.target.value}))} /></label><label>GMV<input inputMode="decimal" value={reviewDraft.gmv} onChange={e=>setReviewDraft(prev=>({...prev,gmv:e.target.value}))} placeholder="填写数字" /></label></div><label>复盘备注<textarea rows={3} value={reviewDraft.notes} onChange={e=>setReviewDraft(prev=>({...prev,notes:e.target.value}))} placeholder="记录画面、评论反馈、异常情况等" /></label><button className="save-review vf-button vf-button-primary" disabled={!reviewDraft.title.trim() || !reviewDraft.product.trim()} onClick={addReviewRecord}>保存并生成复盘</button></section><section className="review-list"><div className="review-list-head"><div><h2>发布记录</h2><p>按最新录入排序，点击视频标题可查看链接。</p></div><input value={reviewSearch} onChange={e=>setReviewSearch(e.target.value)} placeholder="搜索标题、产品、账号…" /></div>{reviewRecords.filter(item=>`${item.title}${item.product}${item.account}${item.market}`.toLowerCase().includes(reviewSearch.toLowerCase())).length===0 ? <div className="review-empty"><span>▥</span><h3>还没有复盘记录</h3><p>录入第一条发布数据后，这里会自动生成问题判断和优化动作。</p></div> : reviewRecords.filter(item=>`${item.title}${item.product}${item.account}${item.market}`.toLowerCase().includes(reviewSearch.toLowerCase())).map(item=>{ const insight=diagnoseReview(item); return <article className="review-card" key={item.id}><header><div><span>{item.market} · {item.account || "未填账号"}</span><h3>{item.videoUrl ? <a href={item.videoUrl} target="_blank" rel="noreferrer">{item.title} ↗</a> : item.title}</h3><p>{item.product}{item.scriptTitle ? ` · ${item.scriptTitle}` : ""}</p></div><strong>{insight.score}<small>/100</small></strong></header><div className="review-card-metrics"><span>播放 <b>{metric(item.views).toLocaleString()}</b></span><span>3秒 <b>{metric(item.retention3s)}%</b></span><span>完播 <b>{metric(item.completion)}%</b></span><span>点击 <b>{metric(item.ctr)}%</b></span><span>转化 <b>{metric(item.cvr)}%</b></span><span>订单 <b>{metric(item.orders)}</b></span></div><div className="review-insight"><section><span>系统诊断</span>{insight.issues.map(x=><p key={x}>! {x}</p>)}</section><section><span>下一步动作</span>{insight.actions.map(x=><p key={x}>→ {x}</p>)}</section></div>{item.notes&&<p className="review-notes">备注：{item.notes}</p>}<footer><small>{item.publishDate} · 录入于 {new Date(item.createdAt).toLocaleString("zh-CN")}</small><button onClick={()=>saveReviews(reviewRecords.filter(x=>x.id!==item.id))}>删除记录</button></footer></article>})}</section></div></section>}
      {active === "products" && <section className="product-center-panel"><div className="product-center-toolbar"><div><span className="modal-kicker">产品知识中心</span><h2>团队产品档案</h2><p>统一管理卖点、参数、禁用词、市场和促销信息，生成脚本时直接调用。</p></div><input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="搜索产品、品牌或市场…" /></div><div className="product-center-grid"><section className="product-editor"><div className="product-editor-head"><div><span>{editingProductId ? "EDIT PRODUCT" : "NEW PRODUCT"}</span><h3>{editingProductId ? "编辑产品资料" : "新增产品资料"}</h3></div>{editingProductId && <button onClick={() => { setEditingProductId(null); setProductDraft(emptyProductDraft); }}>取消编辑</button>}</div><div className="product-form-cols"><label>产品名称 *<input value={productDraft.name} onChange={e => setProductDraft(prev => ({...prev,name:e.target.value}))} placeholder="例如：自动除尘钢化膜" /></label><label>品牌<input value={productDraft.brand} onChange={e => setProductDraft(prev => ({...prev,brand:e.target.value}))} placeholder="例如：CrystalArmor" /></label></div><label>产品类目<input value={productDraft.category} onChange={e => setProductDraft(prev => ({...prev,category:e.target.value}))} placeholder="例如：手机配件 / 钢化膜" /></label><label>核心卖点 *<textarea rows={5} value={productDraft.sellingPoints} onChange={e => setProductDraft(prev => ({...prev,sellingPoints:e.target.value}))} placeholder="每条卖点用分号隔开" /></label><label>产品参数<textarea rows={3} value={productDraft.parameters} onChange={e => setProductDraft(prev => ({...prev,parameters:e.target.value}))} placeholder="角度、材质、尺寸、包装、兼容性等" /></label><label>禁用词 / 禁止表达<textarea rows={3} value={productDraft.bannedWords} onChange={e => setProductDraft(prev => ({...prev,bannedWords:e.target.value}))} placeholder="例如：100%防爆；永不碎；全网第一" /></label><div className="product-form-cols"><label>目标国家<input value={productDraft.markets} onChange={e => setProductDraft(prev => ({...prev,markets:e.target.value}))} placeholder="西班牙、意大利" /></label><label>价格信息<input value={productDraft.price} onChange={e => setProductDraft(prev => ({...prev,price:e.target.value}))} placeholder="例如：€19.99" /></label></div><label>目标用户<input value={productDraft.audience} onChange={e => setProductDraft(prev => ({...prev,audience:e.target.value}))} placeholder="主要购买人群和使用场景" /></label><label>促销信息<input value={productDraft.offer} onChange={e => setProductDraft(prev => ({...prev,offer:e.target.value}))} placeholder="折扣、赠品、库存说明" /></label><label>内部备注<textarea rows={2} value={productDraft.notes} onChange={e => setProductDraft(prev => ({...prev,notes:e.target.value}))} placeholder="拍摄注意事项、认证材料位置等" /></label><button className="save-product vf-button vf-button-primary" disabled={!productDraft.name.trim() || !productDraft.sellingPoints.trim()} onClick={saveProductProfile}>{editingProductId ? "保存修改" : "保存产品资料"}</button></section><section className="product-card-list">{productProfiles.filter(item => `${item.name}${item.brand}${item.category}${item.markets}`.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? <div className="product-empty">没有找到对应产品。</div> : productProfiles.filter(item => `${item.name}${item.brand}${item.category}${item.markets}`.toLowerCase().includes(productSearch.toLowerCase())).map(item => <article key={item.id} className="product-profile-card"><header><div className="product-avatar">{item.name.slice(0,1)}</div><div><span>{item.category || "未分类"}</span><h3>{item.name}</h3><p>{item.brand || "未填写品牌"}</p></div><em>{item.markets || "未设置市场"}</em></header><div className="product-facts"><section><span>核心卖点</span><p>{item.sellingPoints}</p></section><section><span>产品参数</span><p>{item.parameters || "暂未填写"}</p></section><section className="banned-fact"><span>禁用表达</span><p>{item.bannedWords || "暂未设置"}</p></section><section><span>价格与促销</span><p>{[item.price,item.offer].filter(Boolean).join(" · ") || "暂未填写"}</p></section></div>{item.notes && <p className="product-note">备注：{item.notes}</p>}<footer><small>更新于 {new Date(item.updatedAt).getTime() === 0 ? "初始资料" : new Date(item.updatedAt).toLocaleString("zh-CN")}</small><div><button onClick={() => editProductProfile(item)}>编辑</button><button onClick={() => saveProducts(productProfiles.filter(x => x.id !== item.id))}>删除</button><button className="use-product" onClick={() => applyProductProfile(item)}>用于生成脚本 →</button></div></footer></article>)}</section></div></section>}
      {active === "checker" && <section className="risk-grade-panel"><div className="checker-grid"><section className="checker-input"><span className="modal-kicker">风险分级检查</span><h2>粘贴需要检测的文案</h2><p>按高、中、低三级识别平台违规、广告夸大、医疗功效、促销合规和危险演示风险，并提供可直接替换的安全表达。</p><textarea value={checkText} onChange={e => { setCheckText(e.target.value); setHasChecked(false); setRiskFilter("全部"); }} rows={18} placeholder="把完整口播、字幕或商品文案粘贴到这里…" /><div><small>{checkText.length}字</small><button className="vf-button vf-button-primary" disabled={!checkText.trim()} onClick={() => setHasChecked(true)}>开始分级检测</button></div><aside className="risk-guide"><span><b>高风险</b> 建议发布前删除或重写</span><span><b>中风险</b> 需要证据、条件或免责声明</span><span><b>低风险</b> 可以使用，建议补充依据</span></aside></section><section className="checker-result risk-result">{!hasChecked ? <div className="checker-empty"><span>✓</span><h3>等待分级检测</h3><p>系统会逐项标出风险等级、风险类型、命中词和推荐替换表达。</p></div> : complianceHits.length === 0 ? <div className="checker-clear"><span>✓</span><h3>暂未命中已知风险词</h3><p>这不代表平台一定审核通过，请继续检查画面真实性、测试条件和促销信息。</p></div> : <><div className="risk-overview"><article className="risk-total"><span>综合判断</span><strong>{complianceHits.some(x => x.level === "高") ? "高风险" : complianceHits.some(x => x.level === "中") ? "中风险" : "低风险"}</strong><small>共命中 {complianceHits.length} 处</small></article><button className={riskFilter === "高" ? "selected" : ""} onClick={() => setRiskFilter(riskFilter === "高" ? "全部" : "高")}><span>高风险</span><strong>{complianceHits.filter(x => x.level === "高").length}</strong><small>删除或重写</small></button><button className={riskFilter === "中" ? "selected" : ""} onClick={() => setRiskFilter(riskFilter === "中" ? "全部" : "中")}><span>中风险</span><strong>{complianceHits.filter(x => x.level === "中").length}</strong><small>补充条件</small></button><button className={riskFilter === "低" ? "selected" : ""} onClick={() => setRiskFilter(riskFilter === "低" ? "全部" : "低")}><span>低风险</span><strong>{complianceHits.filter(x => x.level === "低").length}</strong><small>建议核实</small></button></div><div className="risk-type-row">{["平台违规","广告夸大","医疗功效","促销合规","危险演示"].map(type => <span key={type}>{type} {complianceHits.filter(x => x.riskType === type).length}</span>)}</div>{riskFilter !== "全部" && <button className="clear-risk-filter" onClick={() => setRiskFilter("全部")}>显示全部风险 ×</button>}<div className="risk-list graded-list">{visibleComplianceHits.map((hit,index) => <article key={`${hit.category}-${hit.term}-${index}`} className={`risk-${hit.level === "高" ? "high" : hit.level === "中" ? "medium" : "low"}`}><div><span>{hit.level}风险</span><em>{hit.riskType} · {hit.category}</em></div><h3>命中：{hit.term}</h3><p>{hit.suggestion}</p><aside><b>建议替换</b><span>{hit.replacement}</span></aside></article>)}</div></>}</section></div></section>}
      {active === "breakdown" ? <ViralAnalyzer projectId={projectMemory.workspace.currentProjectId} initialCase={currentAnalyzerCase} cases={viralCases} product={currentDirectorProject?.product||form.product} market={currentDirectorProject?.market||form.country} language={currentDirectorProject?.language||form.language} platform={currentDirectorProject?.platform||"TikTok"} onResult={item=>{updateProjectMemory({analyzerResult:item},{stage:"洞察",progress:20});saveWorkspaceSnapshot({activeView:"breakdown"});}} onSave={item=>saveViralCases([item,...viralCases.filter(x=>x.id!==item.id)])} onReplicate={replicateViralCase}/> : active === "replicate" ? <ViralReplication projectId={projectMemory.workspace.currentProjectId} initialAsset={currentReplicationWorkspace} cases={viralCases} initialCase={currentReplicationSource||replicationCase} products={productProfiles} form={{...form,platform:currentDirectorProject?.platform||"TikTok"}} onGenerated={value=>{updateProjectMemory({replicationResult:value},{stage:"复刻",progress:38});saveWorkspaceSnapshot({activeView:"replicate"});}} onAdopt={(script,reference,setup,candidate,workspace)=>adoptReplication(script,reference,setup,candidate,workspace,"create")} onDirector={(script,reference,setup,candidate,workspace)=>adoptReplication(script,reference,setup,candidate,workspace,"director")} onAnalyze={()=>{setActive("breakdown");saveWorkspaceSnapshot({activeView:"breakdown"})}}/> : active === "create" ? <ScriptStudio
        mode={active}
        form={form}
        products={productProfiles}
        languages={languages}
        styles={styles}
        frameworks={frameworkCatalog}
        referenceScript={referenceScript}
        result={result}
        raceResults={raceResults}
        loading={loading}
        raceLoading={raceLoading}
        inputReady={inputReady}
        error={error}
        aiConnected={aiConnected}
        providerStatuses={providerStatuses}
        selectedProvider={selectedProvider}
        lastProviderRun={lastProviderRun}
        onProviderChange={provider=>{setSelectedProvider(provider);setLastProviderRun(null);setError("");}}
        historyCount={history.length}
        sellingPointKnowledge={pointLibrary}
        onUpdate={update}
        onUseProduct={applyProductProfile}
        onReferenceChange={value=>{setReferenceScript(value);saveWorkspaceSnapshot({referenceScript:value})}}
        onGenerate={generate}
        onGenerateRace={generateRace}
        onAdopt={script=>adoptCurrentScript(script,{duration:Number(form.duration)||30,offer:form.offer})}
        onDraftChange={script=>{const revised=ensureScriptRevision(script);setResult(revised);updateProjectMemory({scriptVersions:[...((projectMemory.projects.find(x=>x.id===projectMemory.workspace.currentProjectId)?.assets.scriptVersions||[]).filter(item=>scriptRevisionIdentity(item as Script)!==revised.revisionId)),revised]},{stage:"脚本",progress:55});saveWorkspaceSnapshot({currentScript:revised,activeView:"create"});}}
        onSaveVersion={saveScriptVersion}
        onCopy={copyText}
        onExport={exportExcel}
        onNavigate={view=>{if(view==="director")setDirectorSourceType("script-studio");setActive(view);saveWorkspaceSnapshot({activeView:view,directorContext:{...adoptedDirectorContext,sourceType:view==="director"?"script-studio":directorSourceType}})}}
        scoreScript={scoreScript}
      /> : active === "checker" ? <section className="checker-panel"><div className="checker-grid"><section className="checker-input"><span className="modal-kicker">文案安全检查</span><h2>粘贴需要检测的文案</h2><p>支持中文、西班牙语和英语。结果仅作为发布前辅助检查，平台还会结合画面、字幕、商品和账号情况。</p><textarea value={checkText} onChange={e => { setCheckText(e.target.value); setHasChecked(false); }} rows={18} placeholder="把完整口播、字幕或商品文案粘贴到这里…" /><div><small>{checkText.length}字</small><button className="vf-button vf-button-primary" disabled={!checkText.trim()} onClick={() => setHasChecked(true)}>开始检测</button></div></section><section className="checker-result">{!hasChecked ? <div className="checker-empty"><span>✓</span><h3>等待检测</h3><p>系统会逐项标出风险词和修改建议。</p></div> : complianceHits.length === 0 ? <div className="checker-clear"><span>✓</span><h3>暂未命中已知风险词</h3><p>这不代表平台一定审核通过，请继续检查画面真实性、测试条件和促销信息。</p></div> : <><div className="checker-summary"><div><span>检测结果</span><strong>{complianceHits.length}处风险</strong></div><b>{complianceHits.filter(x => x.level === "高").length}项高风险</b></div><div className="risk-list">{complianceHits.map((hit,index) => <article key={`${hit.category}-${hit.term}-${index}`} className={hit.level === "高" ? "risk-high" : "risk-medium"}><div><span>{hit.level}风险</span><em>{hit.category}</em></div><h3>命中：{hit.term}</h3><p>{hit.suggestion}</p></article>)}</div></>}</section></div></section> : active === "library" ? <section className="library-panel">
        <div className="library-toolbar"><div className="library-tabs"><button className={libraryType === "hooks" ? "selected" : ""} onClick={() => setLibraryType("hooks")}>爆款开头库 <em>{hookLibrary.length}</em></button><button className={libraryType === "points" ? "selected" : ""} onClick={() => setLibraryType("points")}>产品卖点库 <em>{pointLibrary.length}</em></button><button className={libraryType === "cases" ? "selected" : ""} onClick={() => setLibraryType("cases")}>爆款案例库 <em>{viralCases.length}</em></button></div><input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="搜索内容或产品…" /></div>
        <div className="library-grid"><section className="library-form">{libraryType === "hooks" ? <><span className="modal-kicker">新增开场钩子</span><h2>新增爆款开头</h2><label>名称<input value={hookDraft.title} onChange={e => setHookDraft(prev => ({ ...prev, title: e.target.value }))} placeholder="例如：斧头暴力测试" /></label><label>语言<select value={hookDraft.language} onChange={e => setHookDraft(prev => ({ ...prev, language: e.target.value }))}>{languages.map(x => <option key={x}>{x}</option>)}</select></label><label>开头文案<textarea rows={7} value={hookDraft.copy} onChange={e => setHookDraft(prev => ({ ...prev, copy: e.target.value }))} placeholder="粘贴前3–8秒爆款开头" /></label><button className="modal-primary vf-button vf-button-primary" disabled={!hookDraft.title.trim() || !hookDraft.copy.trim()} onClick={addHookItem}>保存到开头库</button></> : libraryType === "points" ? <><span className="modal-kicker">新增产品卖点</span><h2>新增产品卖点</h2><label>产品名称<input value={pointDraft.product} onChange={e => setPointDraft(prev => ({ ...prev, product: e.target.value }))} placeholder="例如：变形金刚钢化膜" /></label><label>完整卖点<textarea rows={10} value={pointDraft.points} onChange={e => setPointDraft(prev => ({ ...prev, points: e.target.value }))} placeholder="每条卖点用分号隔开" /></label><button className="modal-primary vf-button vf-button-primary" disabled={!pointDraft.product.trim() || !pointDraft.points.trim()} onClick={addPointItem}>保存到卖点库</button></> : <><span className="modal-kicker">爆款案例</span><h2>结构化爆款案例</h2><p>案例从爆款拆解器保存，包含Hook机制、Creative Angle、Proof、CTA和可复刻公式。</p><button className="modal-primary vf-button vf-button-primary" onClick={()=>setActive("breakdown")}>＋ 分析新案例</button></>}</section>
          <section className="library-list">{libraryType === "hooks" ? hookLibrary.filter(item => `${item.title}${item.copy}${item.language}`.toLowerCase().includes(librarySearch.toLowerCase())).map(item => <article key={item.id}><div><span>{item.language}</span><button onClick={() => saveHooks(hookLibrary.filter(x => x.id !== item.id))}>删除</button></div><h3>{item.title}</h3><p>{item.copy}</p><footer><button onClick={() => copyText(item.copy)}>复制</button><button className="use-item" onClick={() => { setReferenceScript(item.copy); setActive("replicate"); }}>用它复刻</button></footer></article>) : libraryType === "points" ? pointLibrary.filter(item => `${item.product}${item.points}`.toLowerCase().includes(librarySearch.toLowerCase())).map(item => <article key={item.id}><div><span>产品卖点</span><button onClick={() => savePoints(pointLibrary.filter(x => x.id !== item.id))}>删除</button></div><h3>{item.product}</h3><p>{item.points}</p><footer><button onClick={() => copyText(item.points)}>复制</button><button className="use-item" onClick={() => { setForm(prev => ({ ...prev, product: item.product, sellingPoints: item.points })); setActive("create"); }}>用于生成</button></footer></article>) : viralCases.filter(item=>`${item.title}${item.source.product}${item.analysis.hook.mechanism}${item.analysis.creativeAngle}`.toLowerCase().includes(librarySearch.toLowerCase())).map(item=><article key={item.id}><div><span>{item.legacy?"历史兼容案例":"结构化案例"}</span><button onClick={()=>saveViralCases(viralCases.filter(x=>x.id!==item.id))}>删除</button></div><h3>{item.title}</h3><p>{item.analysis.hook.original}</p><small>{item.analysis.hook.mechanism} · {item.analysis.creativeAngle} · {item.analysis.ctaStyle}</small><footer><button onClick={()=>replicateViralCase(item)}>用于脚本生成</button><button className="use-item" onClick={()=>replicateViralCase(item)}>基于此案例复刻</button></footer></article>)}</section>
        </div>
      </section> : active === "monitor" ? <section className="monitor-panel">
        <div className="monitor-banner"><div><span>采集连接状态</span><h2>{monitorAccounts.length}个竞品账号已加入监控</h2><p>账号清单和市场分类已经保存。配置第三方TikTok数据服务后，才能每天自动同步新视频并提取前3–5秒开头。</p></div><button onClick={() => setShowConnection(true)}>配置采集接口</button></div>
        <div className="monitor-stats"><article><span>监控账号</span><strong>{monitorAccounts.length}</strong><small>{new Set(monitorAccounts.map(x => x.market)).size}个市场</small></article><article><span>自动采集</span><strong>未启用</strong><small>完成接口配置后开启</small></article><article><span>今日新视频</span><strong>—</strong><small>等待数据接口</small></article><article><span>已沉淀开头</span><strong>{importedHooks.length}</strong><small>本次页面人工导入</small></article></div>
        <div className="monitor-grid"><section className="account-card"><div className="monitor-title"><div><h2>竞品账号清单</h2><p>按市场自动分类，新增账号会保存到团队清单</p></div><button onClick={() => { setAccountError(""); setShowAddAccount(true); }}>＋ 添加账号</button></div><div className="account-list">{monitorAccounts.map((account, index) => <article key={account.url}><div className="account-avatar">M</div><div><h3>{account.handle}</h3><p><span>{account.market}</span><span>{account.product}</span></p></div><small>{index === 0 ? "主账号" : "已添加"}</small><a href={account.url} target="_blank" rel="noreferrer">打开主页 ↗</a></article>)}</div></section>
        <aside className="import-card"><h2>手动导入新视频</h2><p>自动接口接好前，可以粘贴TikTok视频链接，先建立开头库。</p><label>视频链接<input value={importForm.url} onChange={e => setImportForm(prev => ({ ...prev, url: e.target.value }))} placeholder="https://www.tiktok.com/@user/video/..." /></label><label>市场<select value={importForm.market} onChange={e => setImportForm(prev => ({ ...prev, market: e.target.value }))}><option>西班牙</option><option>意大利</option><option>美国</option><option>英国</option><option>墨西哥</option><option>全球</option></select></label><label>开头口播 / 字幕<textarea value={importForm.hook} onChange={e => setImportForm(prev => ({ ...prev, hook: e.target.value }))} rows={4} placeholder="粘贴视频前3–5秒原话" /></label>{error && <p className="error">{error}</p>}<button onClick={importHook}>加入开头库</button><div className="import-note"><b>当前为人工录入</b><span>自动翻译、分类和改写将在数据接口接通后启用</span></div></aside></div>
        <section className="hook-library"><div className="monitor-title"><div><h2>今日爆款开头库</h2><p>仅展示真实采集或人工导入的视频</p></div><div className="hook-filter"><button className="selected">全部市场</button><button>西班牙</button><button>意大利</button><button>美国</button></div></div>{importedHooks.length === 0 ? <div className="monitor-empty"><span>⌁</span><h3>等待第一批视频数据</h3><p>接入采集接口，或在右侧手动导入视频链接和前3秒文案。</p></div> : <div className="hook-list">{importedHooks.map((item, index) => <article key={`${item.createdAt}-${index}`}><div><span>{item.market}</span><small>{new Date(item.createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</small></div><p>{item.hook}</p><a href={item.url} target="_blank" rel="noreferrer">查看原视频 ↗</a></article>)}</div>}</section>
      </section> : active === "history" ? <section className="history-panel"><div className="history-top"><div><h2>全部脚本</h2><p>共 {history.length} 条团队脚本</p></div><button className="vf-button vf-button-primary" onClick={() => setActive("create")}>＋ 新建脚本</button></div>{history.length === 0 ? <div className="history-empty">还没有生成过脚本。</div> : <div className="history-list">{history.map(item => <article key={item.id}><div className="history-icon">{item.product.slice(0, 1)}</div><div className="history-main"><div><span>{item.language}</span><span>{item.style}</span></div><h3>{item.title}</h3><p>{item.hook}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString("zh-CN") : ""}</small></div><div className="history-actions"><button onClick={() => { adoptCurrentScript(item,{duration:inferredScriptDuration(item),offer:""}); setActive("create"); }}>查看</button><button onClick={()=>{adoptCurrentScript(item,{duration:inferredScriptDuration(item),offer:""});setDirectorSourceType("history");setActive("director")}}>AI 导演</button><button onClick={() => exportExcel(item)}>Excel</button></div></article>)}</div>}</section> : null}
    {showAddAccount && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowAddAccount(false); }}><section className="monitor-modal" role="dialog" aria-modal="true" aria-labelledby="add-account-title"><button className="modal-close" onClick={() => setShowAddAccount(false)}>×</button><span className="modal-kicker">添加竞品</span><h2 id="add-account-title">添加TikTok竞品账号</h2><p>填写账号主页链接，添加后会保存到团队监控清单。</p><label>账号主页链接<input autoFocus value={accountForm.url} onChange={e => setAccountForm(prev => ({ ...prev, url: e.target.value }))} placeholder="https://www.tiktok.com/@username" /></label><div className="two-cols"><label>市场<select value={accountForm.market} onChange={e => setAccountForm(prev => ({ ...prev, market: e.target.value }))}><option>全球</option><option>美国</option><option>西班牙</option><option>意大利</option><option>英国</option><option>墨西哥</option><option>德国</option><option>法国</option></select></label><label>产品<input value={accountForm.product} onChange={e => setAccountForm(prev => ({ ...prev, product: e.target.value }))} /></label></div>{accountError && <p className="error">{accountError}</p>}<button className="modal-primary vf-button vf-button-primary" disabled={accountSaving || !accountForm.url.trim()} onClick={addMonitorAccount}>{accountSaving ? "正在保存…" : "确认添加"}</button></section></div>}
    {showConnection && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowConnection(false); }}><section className="monitor-modal connection-modal" role="dialog" aria-modal="true" aria-labelledby="connection-title"><button className="modal-close" onClick={() => setShowConnection(false)}>×</button><span className="modal-kicker">数据连接</span><h2 id="connection-title">自动采集接口尚未配置</h2><p>竞品账号的公开数据不能直接通过普通TikTok账号授权读取，需要使用合规的第三方TikTok数据服务。</p><div className="connection-steps"><article><b>1</b><div><strong>选择数据服务商</strong><span>需要支持按账号获取新视频、播放量、发布时间和视频链接。</span></div></article><article><b>2</b><div><strong>安全配置API密钥</strong><span>密钥应放在网站安全环境变量中，不要粘贴到普通页面或聊天记录。</span></div></article><article><b>3</b><div><strong>启用每日任务</strong><span>接口接通后再开启每日09:00同步、开头提取和去重。</span></div></article></div><div className="connection-status"><i /> 当前状态：未连接，不会伪造采集结果</div><button className="modal-primary vf-button vf-button-primary" onClick={() => setShowConnection(false)}>我知道了</button></section></div>}
    {showTeamLogin && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setShowTeamLogin(false); }}><section className="monitor-modal" role="dialog" aria-modal="true"><button className="modal-close" onClick={() => setShowTeamLogin(false)}>×</button><span className="modal-kicker">团队云端</span><h2>连接苏苏团队空间</h2><p>输入团队专用密码。密码只用于本次页面连接，不会写入网页源码。</p><label>团队密码<input autoFocus type="password" value={teamPassword} onChange={e => setTeamPassword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") void connectTeam(); }} placeholder="请输入团队密码" /></label>{teamError && <p className="error">{teamError}</p>}<button className="modal-primary vf-button vf-button-primary" disabled={!teamPassword || teamBusy} onClick={connectTeam}>{teamBusy ? "正在连接…" : "连接并同步"}</button></section></div>}
  </AppShell>);
}
