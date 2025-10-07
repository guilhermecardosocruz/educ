"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as offline from "@/lib/offline";
import BackBar from "@/components/BackBar";
import ContentImport from "@/components/ContentImport";
import SyncBanner from "@/components/SyncBanner";
import { startTimer, recordTTFB, recordPageError, isOffline } from "@/lib/metrics";

type ContentItem = {
  id: string;
  title: string;
  lesson?: { number: number } | null;
  createdAt?: string;
};

export default function ContentsPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const RK = `contents:${classId}`;
  const URL = `/api/classes/${classId}/conteudos`;

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [pendingLocal, setPendingLocal] = useState(false);

  const total = useMemo(() => items.length, [items]);

  async function reconcile() {
    const t = startTimer("page:contents:reconcile");
    const { data } = await offline.fetchWithCache<any>({ resourceKey: RK, url: URL, onData: (j:any)=>j });
    t.end();
    if (data?.ok) setItems(data.items || []);
    setPendingLocal(await offline.getPendingState(RK));
  }

  useEffect(() => {
    offline.registerReconciler(RK, reconcile);
    let alive = true;
    (async () => {
      const t = startTimer("page:contents:ttfb");
      try {
        const { data, fromCache } = await offline.fetchWithCache<any>({ resourceKey: RK, url: URL, onData: (j:any)=>j });
        if (!alive) return;
        if (data?.ok) setItems(data.items || []);
        setFromCache(fromCache);
        setPendingLocal(await offline.getPendingState(RK));
        recordTTFB("contents", t.end(), { fromCache, offline: isOffline() });
      } catch (e) {
        recordPageError("contents", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [RK, URL]);

  async function deleteAll() {
    if (!confirm("Excluir TODOS os conteúdos desta turma? Esta ação não pode ser desfeita.")) return;
    await offline.writeThrough({
      resourceKey: RK,
      mutation: { method: "DELETE", url: URL },
      optimisticApply: async () => {
        await offline.setJSON(RK, [], { pending: true });
        setItems([]);
        setPendingLocal(true);
      }
    }).catch((e) => {
      alert(e?.message || "Erro ao excluir conteúdos.");
    });
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col">
      <SyncBanner resourceKeys={[RK]} extraPending={pendingLocal} />

      <header className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Conteúdos</h1>
          <p className="text-gray-600 text-sm">
            {fromCache ? "Exibindo dados em cache." : "Dados atualizados."}
            {pendingLocal && <span className="ml-2 text-amber-600">Alterações locais pendentes…</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={deleteAll} className="rounded-xl px-4 py-2 font-medium border shadow-sm bg-white">Excluir todos</button>
          <Link href={`/classes/${classId}/conteudos/new`} className="rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white hover:opacity-90">Adicionar conteúdo</Link>
          <Link href={`/classes/${classId}/conteudos/feed`} className="rounded-xl px-4 py-2 font-medium border shadow-sm bg-white">Visualizar conteúdos</Link>
        </div>
      </header>

      <section className="mb-6 rounded-2xl border p-4 bg-white shadow-sm">
        <h2 className="font-semibold mb-2">Importar conteúdos</h2>
        <p className="text-sm text-gray-600 mb-3">
          Envie um <strong>.csv</strong> com colunas{" "}
          <code>number, title, text, objetivos, desenvolvimento, recursos, bncc</code>.
        </p>
        <ContentImport classId={classId} onImported={() => { offline.markDirtyAndRefetch(RK).then(() => reconcile()); }} />
      </section>

      <section className="flex-1">
        {err && <p className="text-red-600">{err}</p>}
        {!err && (
          loading ? (
            <p className="text-gray-500">Carregando…</p>
          ) : total === 0 ? (
            <p className="text-gray-600">Nenhum conteúdo registrado ainda.</p>
          ) : (
            <ul className="grid gap-3">
              {items.map((c) => (
                <li key={c.id} className="rounded-2xl border p-4 shadow-sm bg-white flex items-center justify-between">
                  <div>
                    <div className="font-semibold">Nº {c.lesson?.number ?? "—"} — {c.title || "Sem título"}</div>
                    {c.createdAt && <div className="text-xs text-gray-500">Criado em {new Date(c.createdAt).toLocaleDateString()}</div>}
                  </div>
                  <Link href={`/classes/${classId}/conteudos/${c.id}`} className="underline text-[var(--color-secondary,#0A66FF)]">Abrir</Link>
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
