"use client";

import { useEffect, useRef, useState } from "react";
import * as offline from "@/lib/offline";
import BackBar from "@/components/BackBar";
import SyncBanner from "@/components/SyncBanner";
import { startTimer, recordTTFB, recordPageError, isOffline } from "@/lib/metrics";

type ClassItem = {
  id: string;
  name: string;
  description?: string | null;
  nextNo: number;
  createdAt: string;
  updatedAt: string;
  _pending?: boolean;
  _error?: string;
};

const RK = "classes:list";
const URL_LIST = "/api/classes";

export default function ClassesPage() {
  const [items, setItems] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [pendingLocal, setPendingLocal] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

  async function reconcile() {
    const t = startTimer("page:classes:reconcile");
    const { data } = await offline.fetchWithCache<ClassItem[]>({
      resourceKey: RK,
      url: URL_LIST,
      onData: (j: any) => (j?.ok ? j.classes : [])
    });
    t.end();
    setItems(data || []);
  }

  useEffect(() => {
    offline.registerReconciler(RK, reconcile);
    let alive = true;
    (async () => {
      setLoading(true);
      const t = startTimer("page:classes:ttfb");
      try {
        const { data, fromCache: cached } = await offline.fetchWithCache<ClassItem[]>({
          resourceKey: RK,
          url: URL_LIST,
          onData: (j: any) => (j?.ok ? j.classes : [])
        });
        if (!alive) return;
        setItems(data || []);
        setFromCache(cached);
        setPendingLocal(await offline.getPendingState(RK));
        recordTTFB("classes", t.end(), { fromCache: cached, offline: isOffline() });
      } catch (e) {
        recordPageError("classes", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError(null);
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      nameRef.current?.focus();
      return;
    }
    setSubmitting(true);
    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();

    await offline.writeThrough({
      resourceKey: RK,
      mutation: {
        method: "POST",
        url: URL_LIST,
        headers: { "Content-Type": "application/json" },
        body: { name: trimmed }
      },
      optimisticApply: async () => {
        const cur = (await offline.getJSON<ClassItem[]>(RK)) ?? [];
        const optimistic: ClassItem = {
          id: tempId,
          name: trimmed,
          description: null,
          nextNo: 1,
          createdAt: nowIso,
          updatedAt: nowIso,
          _pending: true
        };
        await offline.setJSON(RK, [optimistic, ...cur], { pending: true });
        setItems((prev) => [optimistic, ...prev]);
        setPendingLocal(true);
        setName("");
      }
    }).catch((e) => {
      setGlobalError(e?.message || "Erro ao criar turma.");
    });

    setSubmitting(false);
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col">
      <SyncBanner resourceKeys={[RK]} extraPending={pendingLocal} />

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Turmas</h1>
        <p className="text-gray-600 text-sm">
          {fromCache ? "Exibindo dados em cache." : "Dados atualizados."}
          {pendingLocal && <span className="ml-2 text-amber-600">Alterações locais pendentes…</span>}
        </p>
      </header>

      <section className="mb-6">
        <form onSubmit={onCreate} className="flex flex-col sm:flex-row gap-3" noValidate aria-describedby="classes-live" noValidate aria-describedby="classes-live" noValidate aria-describedby="classes-live" noValidate>
          <input
            ref={nameRef}
            type="text"
               placeholder="Nome da turma (ex.: 7º A - 2025)" aria-label="Nome da turma" aria-required="true" aria-label="Nome da turma" aria-required="true" aria-label="Nome da turma" aria-required="true"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border p-2"
            required
            minLength={2}
            disabled={submitting}
          />
          <button
               type="submit" className="btn-a11y rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70" className="btn-a11y rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70" className="btn-a11y rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70"
            disabled={submitting || name.trim().length < 2}
            className="rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70"
          >
            {submitting ? "Criando..." : "Criar turma"}
          </button>
        </form>
        <div id="classes-live" aria-live="polite" className="mt-2 min-h-[1.5rem] text-sm">
          {globalError && <p className="text-red-600">{globalError}</p>}
        </div>
      </section>

      <section className="flex-1">
        {loading ? (
          <p className="text-gray-500">Carregando turmas…</p>
        ) : items.length === 0 ? (
          <p className="text-gray-600">Nenhuma turma criada ainda.</p>
        ) : (
          <ul className="grid gap-3">
            {items.map((c) => (
              <li key={c.id} className="rounded-xl border p-4 shadow-sm bg-white flex items-center justify-between">
                <div>
                  <div className="font-semibold">
                    {c.name} {c._pending && <span className="text-xs text-amber-600 align-middle">(pendente)</span>}
                  </div>
                  <div className="text-xs text-gray-500">
                    Criada em {new Date(c.createdAt).toLocaleDateString()} • Próximo nº: {c.nextNo}
                  </div>
                </div>
                <div className="text-sm">
                  {!c._pending && (
                    <a href={`/classes/${c.id}`} className="underline text-[var(--color-secondary,#0A66FF)]">
                      Abrir
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-10" />
      <BackBar />
    </main>
  );
}
