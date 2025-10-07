"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import * as offline from "@/lib/offline";
import BackBar from "@/components/BackBar";
import SyncBanner from "@/components/SyncBanner";
import { startTimer, recordTTFB, recordPageError, isOffline } from "@/lib/metrics";

type LessonLite = { id: string; number: number; title: string | null; createdAt: string };

export default function ClassCallsPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const id = params.id;
  const page = Math.max(1, parseInt(search.get("page") || "1", 10));
  const pageSize = Math.max(1, Math.min(50, parseInt(search.get("pageSize") || "10", 10)));
  const order = (search.get("order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const RK = `lessons:${id}:p${page}:s${pageSize}:o${order}`;
  const URL = `/api/classes/${id}/chamadas?page=${page}&pageSize=${pageSize}&order=${order}`;

  const [items, setItems] = useState<LessonLite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function reconcile() {
    const t = startTimer("page:lessons:reconcile");
    const { data } = await offline.fetchWithCache<any>({ resourceKey: RK, url: URL, onData: (j:any)=>j });
    t.end();
    if (data?.ok) {
      setItems(data.items);
      setTotal(data.total);
    }
  }

  useEffect(() => {
    offline.registerReconciler(RK, reconcile);
    let alive = true;
    (async () => {
      setLoading(true);
      const t = startTimer("page:lessons:ttfb");
      try {
        const { data, fromCache } = await offline.fetchWithCache<any>({ resourceKey: RK, url: URL, onData: (j:any)=>j });
        if (!alive) return;
        if (data?.ok) {
          setItems(data.items);
          setTotal(data.total);
          setErr(null);
        } else if (fromCache) {
          setErr(null);
        } else {
          setErr(data?.error || "Falha ao carregar chamadas.");
        }
        setFromCache(fromCache);
        recordTTFB("lessons", t.end(), { fromCache, offline: isOffline() });
      } catch (e) {
        recordPageError("lessons", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [RK, URL]);

  function setQuery(upd: Record<string, string | number | undefined>) {
    const qs = new URLSearchParams(search.toString());
    for (const [k, v] of Object.entries(upd)) {
      if (v === undefined || v === null) qs.delete(k);
      else qs.set(k, String(v));
    }
    router.replace(`?${qs.toString()}`);
  }

  function toggleOrder() {
    setQuery({ order: order === "asc" ? "desc" : "asc", page: 1 });
  }
  function goPage(n: number) {
    setQuery({ page: Math.max(1, Math.min(totalPages, n)) });
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col">
      <SyncBanner resourceKeys={[RK]} />

      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Chamadas</h1>
          <p className="text-gray-600 text-sm">{fromCache ? "Exibindo dados em cache." : "Dados atualizados."}</p>
        </div>
        <Link href={`/classes/${id}/chamadas/new`} className="rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white hover:opacity-90">
          Nova chamada
        </Link>
      </header>

      <section className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {loading ? "Carregando…" : `${total} registro(s)`} • Ordenação:{" "}
          <button onClick={toggleOrder} className="underline">number {order === "asc" ? "↑" : "↓"}</button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button onClick={() => goPage(page - 1)} disabled={loading || page <= 1} className="rounded border px-2 py-1 disabled:opacity-50">Anterior</button>
          <span className="px-1">{page} / {totalPages}</span>
          <button onClick={() => goPage(page + 1)} disabled={loading || page >= totalPages} className="rounded border px-2 py-1 disabled:opacity-50">Próxima</button>
        </div>
      </section>

      <section className="flex-1">
        {err && <p className="text-red-600">{err}</p>}
        {!err && (
          loading ? (
            <p className="text-gray-500">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="text-gray-600">Nenhuma chamada registrada ainda.</p>
          ) : (
            <ul className="grid gap-3">
              {items.map((l) => (
                <li key={l.id} className="rounded-xl border p-4 shadow-sm bg-white flex items-center justify-between">
                  <div>
                    <div className="font-semibold">#{l.number} — {l.title || "Sem título"}</div>
                    <div className="text-xs text-gray-500">Criada em {new Date(l.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Link href={`/classes/${id}/chamadas/${l.id}`} className="underline text-[var(--color-secondary,#0A66FF)]">Abrir</Link>
                </li>
              ))}
            </ul>
          )
        )}
      </section>

      <div className="mt-10" />
      <BackBar />
    </main>
  );
}
