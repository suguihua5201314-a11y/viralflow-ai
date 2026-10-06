export const FINAL_SCRIPT_CLIENT_EVENT_VALUES = [
  "script_generation_clicked",
  "script_preflight_started",
  "script_preflight_failed",
  "writer_fetch_started",
  "writer_fetch_settled",
] as const;

export const FINAL_SCRIPT_PREFLIGHT_REASON_VALUES = [
  "missing_current_creative_brief",
  "invalid_product_context",
  "missing_market_or_platform",
  "preflight_exception",
] as const;

export const FINAL_SCRIPT_CLIENT_STAGE_VALUES = ["script_generation", "script_preflight", "writer_fetch"] as const;
export const FINAL_SCRIPT_CLIENT_STATUS_VALUES = ["started", "failed", "success", "http_error", "network_error"] as const;
export const FINAL_SCRIPT_CLIENT_ROUTE = "/api/script-writer" as const;
export const FINAL_SCRIPT_CLIENT_DIAGNOSTIC_MAX_BYTES = 1_024;

export type FinalScriptClientEventName = typeof FINAL_SCRIPT_CLIENT_EVENT_VALUES[number];
export type FinalScriptPreflightReason = typeof FINAL_SCRIPT_PREFLIGHT_REASON_VALUES[number];
export type FinalScriptClientStage = typeof FINAL_SCRIPT_CLIENT_STAGE_VALUES[number];
export type FinalScriptClientStatus = typeof FINAL_SCRIPT_CLIENT_STATUS_VALUES[number];

export type FinalScriptClientDiagnostic = {
  event: FinalScriptClientEventName;
  clientCorrelationId: string;
  stage: FinalScriptClientStage;
  route: typeof FINAL_SCRIPT_CLIENT_ROUTE;
  status: FinalScriptClientStatus;
  reasonCode?: FinalScriptPreflightReason;
  statusClass?: string;
};

const eventSet = new Set<string>(FINAL_SCRIPT_CLIENT_EVENT_VALUES);
const reasonSet = new Set<string>(FINAL_SCRIPT_PREFLIGHT_REASON_VALUES);
const allowedKeys = new Set(["event", "clientCorrelationId", "stage", "route", "status", "reasonCode", "statusClass"]);

function safeCorrelationId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9:_-]{1,100}$/.test(value);
}

export function parseFinalScriptClientDiagnostic(value: unknown): FinalScriptClientDiagnostic | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return null;
  if (!eventSet.has(String(record.event)) || !safeCorrelationId(record.clientCorrelationId)) return null;
  if (record.route !== FINAL_SCRIPT_CLIENT_ROUTE) return null;
  if (record.reasonCode !== undefined && !reasonSet.has(String(record.reasonCode))) return null;
  if (record.statusClass !== undefined && (typeof record.statusClass !== "string" || !/^[1-5]xx$/.test(record.statusClass))) return null;

  const event = record.event as FinalScriptClientEventName;
  const expected = event === "script_generation_clicked"
    ? { stage: "script_generation", status: "started" }
    : event === "script_preflight_started"
      ? { stage: "script_preflight", status: "started" }
      : event === "script_preflight_failed"
        ? { stage: "script_preflight", status: "failed" }
        : event === "writer_fetch_started"
          ? { stage: "writer_fetch", status: "started" }
          : { stage: "writer_fetch", status: record.status };
  if (record.stage !== expected.stage || record.status !== expected.status) return null;
  if (event === "script_preflight_failed" ? record.reasonCode === undefined : record.reasonCode !== undefined) return null;
  if (event === "writer_fetch_settled") {
    if (!new Set(["success", "http_error", "network_error"]).has(String(record.status))) return null;
    if (record.status === "network_error" && record.statusClass !== undefined) return null;
  } else if (record.statusClass !== undefined) return null;

  return record as FinalScriptClientDiagnostic;
}

export function finalScriptPreflightUserMessage(reasonCode: string) {
  if (reasonCode === "missing_current_creative_brief") return "当前创意依据不可用，请返回「创意」重新确认创意方向。";
  if (reasonCode === "invalid_product_context") return "当前商品信息不完整，请返回「商品」检查商品资料。";
  if (reasonCode === "missing_market_or_platform") return "当前市场或平台信息不完整，请返回「商品」检查设置。";
  return "脚本生成准备失败，请重试。";
}
