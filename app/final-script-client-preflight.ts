import type { StructuredScript } from "./script-generation";
import {
  FINAL_SCRIPT_CLIENT_ROUTE,
  type FinalScriptClientDiagnostic,
  type FinalScriptPreflightReason,
} from "./client-diagnostics";

export type FinalScriptClientEvent =
  | { event: "script_generation_clicked"; correlationId: string }
  | { event: "script_preflight_started"; correlationId: string }
  | { event: "writer_fetch_started"; correlationId: string }
  | { event: "script_preflight_failed"; correlationId: string; reasonCode: FinalScriptPreflightReason }
  | { event: "writer_fetch_settled"; correlationId: string; result: "success" | "http_error" | "network_error"; statusClass?: string };

export type FinalScriptPreflightResult<T> =
  | { ok: true; value: T }
  | { ok: false; reasonCode: FinalScriptPreflightReason };

export class FinalScriptPreflightError extends Error {
  constructor(readonly reasonCode: FinalScriptPreflightReason) {
    super(reasonCode);
    this.name = "FinalScriptPreflightError";
  }
}

export function createFinalScriptClientCorrelationId() {
  try { return globalThis.crypto.randomUUID(); }
  catch { return `script-client-${Date.now().toString(36)}`; }
}

export type FinalScriptClientDiagnosticTransport = (diagnostic: FinalScriptClientDiagnostic) => void | Promise<void>;

export function toFinalScriptClientDiagnostic(event: FinalScriptClientEvent): FinalScriptClientDiagnostic {
  if (event.event === "script_generation_clicked") return { event: event.event, clientCorrelationId: event.correlationId, stage: "script_generation", route: FINAL_SCRIPT_CLIENT_ROUTE, status: "started" };
  if (event.event === "script_preflight_started") return { event: event.event, clientCorrelationId: event.correlationId, stage: "script_preflight", route: FINAL_SCRIPT_CLIENT_ROUTE, status: "started" };
  if (event.event === "script_preflight_failed") return { event: event.event, clientCorrelationId: event.correlationId, stage: "script_preflight", route: FINAL_SCRIPT_CLIENT_ROUTE, status: "failed", reasonCode: event.reasonCode };
  if (event.event === "writer_fetch_started") return { event: event.event, clientCorrelationId: event.correlationId, stage: "writer_fetch", route: FINAL_SCRIPT_CLIENT_ROUTE, status: "started" };
  return { event: event.event, clientCorrelationId: event.correlationId, stage: "writer_fetch", route: FINAL_SCRIPT_CLIENT_ROUTE, status: event.result, ...(event.statusClass ? { statusClass: event.statusClass } : {}) };
}

export async function postFinalScriptClientDiagnostic(diagnostic: FinalScriptClientDiagnostic, fetcher: typeof fetch = fetch) {
  try {
    await fetcher("/api/client-diagnostics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(diagnostic),
      keepalive: true,
    });
  } catch { /* Best-effort telemetry must never affect generation. */ }
}

export function emitFinalScriptClientEvent(event: FinalScriptClientEvent, transport: FinalScriptClientDiagnosticTransport = postFinalScriptClientDiagnostic) {
  try { console.info(JSON.stringify({ scope: "final_script_client", ...event })); }
  catch { /* Diagnostics must never interrupt generation. */ }
  try {
    void Promise.resolve(transport(toFinalScriptClientDiagnostic(event))).catch(() => undefined);
  } catch { /* Synchronous transport failures are also non-blocking. */ }
}

export function normalizeRecentScriptHistory(value: unknown, limit = 6): StructuredScript[] {
  return Array.isArray(value) ? value.slice(-limit) as StructuredScript[] : [];
}

export function runFinalScriptPreflight<T>(prepare: () => T): FinalScriptPreflightResult<T> {
  try { return { ok: true, value: prepare() }; }
  catch (error) {
    return {
      ok: false,
      reasonCode: error instanceof FinalScriptPreflightError ? error.reasonCode : "preflight_exception",
    };
  }
}

export async function observedWriterFetch(
  correlationId: string,
  input: RequestInfo | URL,
  init?: RequestInit,
  fetcher: typeof fetch = fetch,
  diagnosticTransport: FinalScriptClientDiagnosticTransport = postFinalScriptClientDiagnostic,
) {
  emitFinalScriptClientEvent({ event: "writer_fetch_started", correlationId }, diagnosticTransport);
  try {
    const response = await fetcher(input, init);
    emitFinalScriptClientEvent({
      event: "writer_fetch_settled",
      correlationId,
      result: response.ok ? "success" : "http_error",
      statusClass: `${Math.floor(response.status / 100)}xx`,
    }, diagnosticTransport);
    return response;
  } catch (error) {
    emitFinalScriptClientEvent({ event: "writer_fetch_settled", correlationId, result: "network_error" }, diagnosticTransport);
    throw error;
  }
}
