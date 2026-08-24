import type { ProviderId, ProviderStatus } from "./provider-types";

type Timestamped = { createdAt?: string };
type ProductMetricSource = { id: number; name: string; updatedAt: string };
type CaseMetricSource = { id: string; title: string; createdAt: string };
type ScriptMetricSource = Timestamped & { id?: number; title: string; product: string };

export type DashboardActivity = { id: string; type: "脚本" | "案例" | "产品"; title: string; timestamp: string };
export type DashboardProvider = { id: ProviderId; label: string; status: "已连接" | "配置不完整" | "未配置"; connected: boolean };
export type DashboardMetrics = {
  counts: { products: number; cases: number; scripts: number; recent: number; variants: number | null; director: number | null; voice: number | null };
  periods: { today: number; week: number; month: number; available: boolean };
  usage: { scripts: number; analyzer: number; replication: number | null; director: number | null; voice: number | null };
  activity: DashboardActivity[];
  trend: Array<{ label: string; count: number }>;
  providers: DashboardProvider[];
};

const validDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || date.getTime() <= 0 ? null : date;
};

export function buildDashboardMetrics(input: {
  products: ProductMetricSource[];
  cases: CaseMetricSource[];
  scripts: ScriptMetricSource[];
  currentScript: ScriptMetricSource | null;
  recentCount: number;
  providers: Record<ProviderId, ProviderStatus>;
  now?: Date;
}): DashboardMetrics {
  const now = input.now ?? new Date();
  const activities: DashboardActivity[] = [];
  const seenCurrent = input.currentScript && input.scripts.some(item => item.id === input.currentScript?.id || item.title === input.currentScript?.title);
  for (const script of input.scripts) {
    const date = validDate(script.createdAt);
    if (date) activities.push({ id: `script-${script.id ?? script.title}-${date.getTime()}`, type: "脚本", title: `生成了${script.product || "产品"}脚本`, timestamp: date.toISOString() });
  }
  if (input.currentScript && !seenCurrent) {
    const date = validDate(input.currentScript.createdAt);
    if (date) activities.push({ id: `current-${input.currentScript.id ?? input.currentScript.title}`, type: "脚本", title: `采用了${input.currentScript.product || "产品"}脚本`, timestamp: date.toISOString() });
  }
  for (const item of input.cases) {
    const date = validDate(item.createdAt);
    if (date) activities.push({ id: `case-${item.id}`, type: "案例", title: `保存了创意案例「${item.title}」`, timestamp: date.toISOString() });
  }
  for (const product of input.products) {
    const date = validDate(product.updatedAt);
    if (date) activities.push({ id: `product-${product.id}`, type: "产品", title: `更新了产品知识「${product.name}」`, timestamp: date.toISOString() });
  }
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const dated = activities.map(item => new Date(item.timestamp).getTime());
  const trend = Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    return { label: `${start.getMonth() + 1}/${start.getDate()}`, count: dated.filter(value => value >= start.getTime() && value < end.getTime()).length };
  });
  const providers = (["deepseek", "doubao", "openai"] as ProviderId[]).map(id => {
    const item = input.providers[id];
    const connected = Boolean(item?.configured);
    return { id, label: item?.label || id, connected, status: connected ? "已连接" as const : item?.missingFields?.length ? "配置不完整" as const : "未配置" as const };
  });
  return {
    counts: { products: input.products.length, cases: input.cases.length, scripts: input.scripts.length, recent: input.recentCount, variants: null, director: null, voice: null },
    periods: { today: dated.filter(value => value >= dayStart).length, week: dated.filter(value => value >= dayStart - 6 * 86400000).length, month: dated.filter(value => value >= monthStart).length, available: dated.length > 0 },
    usage: { scripts: input.scripts.length, analyzer: input.cases.length, replication: null, director: null, voice: null },
    activity: activities.slice(0, 6), trend,
    providers,
  };
}
