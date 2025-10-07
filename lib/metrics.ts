/**
 * lib/metrics.ts
 * Coleta simples (placeholders) de:
 * - Latência de sync (fila/processQueue)
 * - TTFB (offline vs online)
 * - Taxa de erro em páginas e APIs
 *
 * Por ora, apenas console.* (substituir por provedor real depois).
 */

type Timer = { end: (extra?: Record<string, any>) => number };

function now() {
  return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
}

export function startTimer(label: string, ctx?: Record<string, any>): Timer {
  const t0 = now();
  return {
    end(extra?: Record<string, any>) {
      const ms = Math.max(0, now() - t0);
      try {
        // eslint-disable-next-line no-console
        console.log(`[metrics] timer:end`, { label, ms, ...ctx, ...extra });
      } catch {}
      return ms;
    }
  };
}

export function recordTTFB(page: string, ms: number, opts?: { fromCache?: boolean; offline?: boolean }) {
  try {
    // eslint-disable-next-line no-console
    console.log(`[metrics] ttfb`, { page, ms, ...opts });
  } catch {}
}

export function recordSyncLatency(resourceKey: string, ms: number, outcome: "ok" | "error") {
  try {
    // eslint-disable-next-line no-console
    console.log(`[metrics] sync_latency`, { resourceKey, ms, outcome });
  } catch {}
}

export function recordApi(name: string, ms: number, status: number, ok: boolean, meta?: Record<string, any>) {
  try {
    // eslint-disable-next-line no-console
    console.log(`[metrics] api`, { name, ms, status, ok, ...meta });
  } catch {}
}

export function recordPageError(page: string, err: unknown) {
  try {
    // eslint-disable-next-line no-console
    console.error(`[metrics] page_error`, { page, err: String(err) });
  } catch {}
}

export async function measureSync<T>(resourceKey: string, fn: () => Promise<T>): Promise<T> {
  const t = startTimer("sync", { resourceKey });
  try {
    const out = await fn();
    recordSyncLatency(resourceKey, t.end({ outcome: "ok" }), "ok");
    return out;
  } catch (e) {
    recordSyncLatency(resourceKey, t.end({ outcome: "error" }), "error");
    throw e;
  }
}

export function isOffline(): boolean {
  try {
    return typeof navigator !== "undefined" ? !navigator.onLine : false;
  } catch {
    return false;
  }
}
