import type { StructuredScript } from "./script-generation";

export type FinalScriptClientEvent =
  | { event: "script_generation_clicked" | "script_preflight_started" | "writer_fetch_started"; correlationId: string }
  | { event: "script_preflight_failed"; correlationId: string; reasonCode: string }
  | { event: "writer_fetch_settled"; correlationId: string; result: "success" | "http_error" | "network_error"; statusClass?: string };

export type FinalScriptPreflightResult<T> =
  | { ok: true; value: T }
  | { ok: false; reasonCode: string };

export class FinalScriptPreflightError extends Error {
  constructor(readonly reasonCode: string) {
    super(reasonCode);
    this.name = "FinalScriptPreflightError";
  }
}

export function createFinalScriptClientCorrelationId() {
  try { return globalThis.crypto.randomUUID(); }
  catch { return `script-client-${Date.now().toString(36)}`; }
}

export function emitFinalScriptClientEvent(event: FinalScriptClientEvent) {
  try { console.info(JSON.stringify({ scope: "final_script_client", ...event })); }
  catch { /* Diagnostics must never interrupt generation. */ }
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
) {
  emitFinalScriptClientEvent({ event: "writer_fetch_started", correlationId });
  try {
    const response = await fetcher(input, init);
    emitFinalScriptClientEvent({
      event: "writer_fetch_settled",
      correlationId,
      result: response.ok ? "success" : "http_error",
      statusClass: `${Math.floor(response.status / 100)}xx`,
    });
    return response;
  } catch (error) {
    emitFinalScriptClientEvent({ event: "writer_fetch_settled", correlationId, result: "network_error" });
    throw error;
  }
}
