"use client";

/**
 * Offline-first cache util for EDUC
 * - IndexedDB (preferred) with localStorage fallback
 * - Write-through: mutations are queued and retried; cache is updated optimistically with pending marks
 * - Reconciliation: after server confirmation, re-fetch truth from Neon and replace local cache
 * - Source of truth: server (Neon) always wins on reconciliation
 *
 * Usage sketch:
 *   import * as offline from "@/lib/offline";
 *
 *   // register a reconciler that knows how to revalidate a resource from server
 *   offline.registerReconciler("classes:list", async () => {
 *     const res = await fetch("/api/classes", { cache: "no-store" });
 *     const json = await res.json();
 *     if (json?.ok) await offline.setJSON("classes:list", json.classes);
 *   });
 *
 *   // read cached list
 *   const cached = await offline.getJSON<ClassItem[]>("classes:list");
 *
 *   // queue a POST with optimistic update
 *   await offline.queueMutation({
 *     resourceKey: "classes:list",
 *     mutation: {
 *       method: "POST",
 *       url: "/api/classes",
 *       body: { name: "Turma X" }
 *     },
 *     optimisticApply: async () => {
 *       const cur = (await offline.getJSON<any[]>("classes:list")) ?? [];
 *       const temp = { id: `temp-${Date.now()}`, name: "Turma X", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), _pending: true, nextNo: 1 };
 *       await offline.setJSON("classes:list", [temp, ...cur]);
 *     }
 *   });
 */

type Json = any;

type QueueItem = {
  id: string;
  mutation: {
    method: "POST" | "PATCH" | "PUT" | "DELETE";
    url: string;
    headers?: Record<string, string>;
    body?: any; // will be stringified
  };
  resourceKey?: string;
  attempts: number;
  enqueuedAt: number;
  lastError?: string;
};

type StoredValue = {
  key: string;
  value: Json;
  pending?: boolean; // if true, indicates local view has unconfirmed changes
  updatedAt: number;
};

const DB_NAME = "educ_offline";
const STORE_KVS = "kvs";
const STORE_QUEUE = "queue";
const LSK_PREFIX = "__educ_kvs__:";
const LSK_QUEUE = "__educ_queue__";
const MAX_ATTEMPTS = 6;

let idbPromise: Promise<IDBDatabase> | null = null;
const reconcilers = new Map<string, () => Promise<void>>();

/* ----------------------------- IndexedDB core ----------------------------- */

function supportsIDB() {
  return typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  if (!supportsIDB()) return Promise.reject(new Error("IndexedDB not available"));

  if (!idbPromise) {
    idbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_KVS)) db.createObjectStore(STORE_KVS, { keyPath: "key" });
        if (!db.objectStoreNames.contains(STORE_QUEUE)) db.createObjectStore(STORE_QUEUE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return idbPromise;
}

async function idbGet<T = any>(store: string, key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const st = tx.objectStore(store);
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut<T = any>(store: string, value: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const st = tx.objectStore(store);
    const req = st.put(value as any);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(store: string, key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const st = tx.objectStore(store);
    const req = st.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbAll<T = any>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const st = tx.objectStore(store);
    const req = st.getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

/* ---------------------------- localStorage fallback ---------------------------- */

function lsGet<T = any>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(LSK_PREFIX + key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

function lsSet<T = any>(key: string, val: T) {
  try {
    localStorage.setItem(LSK_PREFIX + key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

function lsDel(key: string) {
  try {
    localStorage.removeItem(LSK_PREFIX + key);
  } catch {
    /* ignore */
  }
}

function lsQueueGet(): QueueItem[] {
  try {
    const raw = localStorage.getItem(LSK_QUEUE);
    if (!raw) return [];
    return JSON.parse(raw) as QueueItem[];
  } catch {
    return [];
  }
}

function lsQueueSet(items: QueueItem[]) {
  try {
    localStorage.setItem(LSK_QUEUE, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/* ------------------------------ Public KVS API ------------------------------ */

export async function getJSON<T = any>(key: string): Promise<T | null> {
  if (supportsIDB()) {
    const row = await idbGet<StoredValue>(STORE_KVS, key).catch(() => undefined);
    return (row?.value as T) ?? null;
  }
  const row = lsGet<StoredValue>(key);
  return (row?.value as T) ?? null;
}

export async function setJSON(key: string, value: Json, opts?: { pending?: boolean }) {
  const row: StoredValue = {
    key,
    value,
    pending: !!opts?.pending,
    updatedAt: Date.now()
  };
  if (supportsIDB()) {
    await idbPut(STORE_KVS, row);
  } else {
    lsSet(key, row);
  }
}

/** Mark/unmark a resource as having pending local changes */
export async function setPending(key: string, pending: boolean) {
  const cur = (supportsIDB()
    ? await idbGet<StoredValue>(STORE_KVS, key)
    : lsGet<StoredValue>(key)) || { key, value: null, updatedAt: Date.now() };

  const row: StoredValue = { ...cur, key, pending, updatedAt: Date.now() };
  if (supportsIDB()) await idbPut(STORE_KVS, row);
  else lsSet(key, row);
}

export async function clearKey(key: string) {
  if (supportsIDB()) await idbDelete(STORE_KVS, key);
  else lsDel(key);
}

/* ------------------------------ Queue (mutations) ------------------------------ */

function uuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function queueAll(): Promise<QueueItem[]> {
  if (supportsIDB()) {
    return idbAll<QueueItem>(STORE_QUEUE).catch(() => []);
  }
  return lsQueueGet();
}

async function queuePut(item: QueueItem) {
  if (supportsIDB()) await idbPut(STORE_QUEUE, item);
  else {
    const all = lsQueueGet();
    const next = all.filter((i) => i.id !== item.id).concat(item);
    lsQueueSet(next);
  }
}

async function queueDelete(id: string) {
  if (supportsIDB()) await idbDelete(STORE_QUEUE, id);
  else {
    const all = lsQueueGet().filter((i) => i.id !== id);
    lsQueueSet(all);
  }
}

/**
 * Queue a mutation with optional optimistic application and reconciling resourceKey
 */
export async function queueMutation(args: {
  resourceKey?: string;
  mutation: QueueItem["mutation"];
  optimisticApply?: () => Promise<void> | void;
}) {
  const qi: QueueItem = {
    id: uuid(),
    mutation: args.mutation,
    resourceKey: args.resourceKey,
    attempts: 0,
    enqueuedAt: Date.now()
  };

  // optimistic apply + mark pending
  if (args.optimisticApply) {
    await args.optimisticApply();
  }
  if (args.resourceKey) {
    await setPending(args.resourceKey, true);
  }

  await queuePut(qi);
  triggerProcessQueueSoon();
}

/* ------------------------------ Reconciliation ------------------------------ */

export function registerReconciler(key: string, fn: () => Promise<void>) {
  reconcilers.set(key, fn);
}

/** After a mutation confirmation, refresh the authoritative data from server for a resource key */
async function reconcileKey(key?: string) {
  if (!key) return;
  const fn = reconcilers.get(key);
  if (!fn) return;
  try {
    await fn(); // should fetch truth from Neon and setJSON(key, truth, { pending:false })
    await setPending(key, false);
  } catch (e) {
    // if reconcile fails, keep pending=true to signal stale local view
    await setPending(key, true);
  }
}

/* ------------------------------ Queue processing ------------------------------ */

let processing = false;
let scheduled = false;

function triggerProcessQueueSoon() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    void processQueue();
  }, 250);
}

export async function processQueue() {
  if (processing) return;
  processing = true;
  try {
    const items = await queueAll();

    for (const item of items) {
      // skip if too many attempts
      if (item.attempts >= MAX_ATTEMPTS) {
        await queueDelete(item.id);
        continue;
      }

      // If offline, abort loop early
      if (typeof navigator !== "undefined" && !navigator.onLine) break;

      try {
        const res = await fetch(item.mutation.url, {
          method: item.mutation.method,
          headers: {
            "Content-Type": "application/json",
            ...(item.mutation.headers || {})
          },
          body: item.mutation.body ? JSON.stringify(item.mutation.body) : undefined
        });

        // consider 2xx as success
        if (res.ok) {
          await queueDelete(item.id);
          // Reconcile authoritative state for resource key
          await reconcileKey(item.resourceKey);
          continue;
        }

        // retryable?
        if (res.status >= 500 || res.status === 429) {
          item.attempts += 1;
          item.lastError = `HTTP ${res.status}`;
          await queuePut(item);
          // small backoff
          await delay(backoffMs(item.attempts));
        } else {
          // client error: drop from queue but keep pending=false via reconcile attempt
          await queueDelete(item.id);
          await reconcileKey(item.resourceKey);
        }
      } catch (err: any) {
        // Network error: retry later
        item.attempts += 1;
        item.lastError = err?.message || "network";
        await queuePut(item);
        await delay(backoffMs(item.attempts));
      }
    }
  } finally {
    processing = false;
  }
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function backoffMs(attempt: number) {
  // 0.5s, 1s, 2s, 4s, 8s, 16s (cap 20s)
  return Math.min(20000, 500 * Math.pow(2, Math.max(0, attempt - 1)));
}

/* ------------------------------ Bootstrap listeners ------------------------------ */

if (typeof window !== "undefined") {
  window.addEventListener("online", () => triggerProcessQueueSoon());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") triggerProcessQueueSoon();
  });
}

/* ------------------------------ Helpers for typical flows ------------------------------ */

/**
 * fetchWithCache:
 * - GETs from server and saves to cache (and clears pending=false)
 * - If request fails, returns cached value (may be stale)
 */
export async function fetchWithCache<T = any>(args: {
  resourceKey: string;
  url: string;
  onData?: (data: any) => T;
}): Promise<{ data: T | null; fromCache: boolean }> {
  const { resourceKey, url, onData } = args;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const data = onData ? onData(json) : (json as T);
    await setJSON(resourceKey, data, { pending: false });
    return { data, fromCache: false };
  } catch {
    // fallback to cache
    const cached = await getJSON<T>(resourceKey);
    return { data: cached, fromCache: true };
  }
}

/**
 * writeThrough:
 * - Perform a mutation immediately
 * - On success: reconcile resource key
 * - On failure: queue for retry and keep cache pending=true
 * - If optimisticApply is provided, it will be called before attempting the mutation
 */
export async function writeThrough(args: {
  resourceKey?: string;
  mutation: QueueItem["mutation"];
  optimisticApply?: () => Promise<void> | void;
}) {
  // Optimistic update
  if (args.optimisticApply) await args.optimisticApply();
  if (args.resourceKey) await setPending(args.resourceKey, true);

  // Try immediate execution
  try {
    const res = await fetch(args.mutation.url, {
      method: args.mutation.method,
      headers: { "Content-Type": "application/json", ...(args.mutation.headers || {}) },
      body: args.mutation.body ? JSON.stringify(args.mutation.body) : undefined
    });
    if (res.ok) {
      await reconcileKey(args.resourceKey);
      return;
    }
    // enqueue if retryable
    if (res.status >= 500 || res.status === 429) {
      await queueMutation(args);
    } else {
      // non-retryable: still try to reconcile to override pending local view
      await reconcileKey(args.resourceKey);
    }
  } catch {
    // network error => queue it
    await queueMutation(args);
  }
}

/**
 * markDirtyAndRefetch:
 * Use when you know the server has changed (websocket, SSE, or after a separate action)
 * It ensures local cache is refreshed from Neon and marked as non-pending.
 */
export async function markDirtyAndRefetch(resourceKey: string) {
  await setPending(resourceKey, true);
  await reconcileKey(resourceKey);
}

/**
 * getPendingState:
 * Returns whether the cached resource has unconfirmed local changes.
 */
export async function getPendingState(resourceKey: string): Promise<boolean> {
  const row = supportsIDB()
    ? await idbGet<StoredValue>(STORE_KVS, resourceKey).catch(() => undefined)
    : lsGet<StoredValue>(resourceKey);
  return !!row?.pending;
}

/**
 * debugDump:
 * Returns a snapshot of KVS and Queue (for diagnostics).
 */
export async function debugDump() {
  const kvs = supportsIDB()
    ? await idbAll<StoredValue>(STORE_KVS).catch(() => [])
    : Object.keys(localStorage)
        .filter((k) => k.startsWith(LSK_PREFIX))
        .map((k) => lsGet<StoredValue>(k.replace(LSK_PREFIX, "")))
        .filter(Boolean);

  const queue = await queueAll();
  return { kvs, queue };
}
