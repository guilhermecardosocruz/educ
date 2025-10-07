"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import * as offline from "@/lib/offline";
import Link from "next/link";
import BackBar from "@/components/BackBar";
import SyncBanner from "@/components/SyncBanner";
import { startTimer, recordTTFB, recordPageError, isOffline } from "@/lib/metrics";

type ClassMeta = {
  id: string;
  name: string;
  description?: string | null;
  nextNo: number;
  createdAt: string;
  updatedAt: string;
};
type Resp = {
  ok: boolean;
  class: ClassMeta;
  counts: { students: number; lessons: number; contents: number };
  lastLessonAt: string | null;
};

export default function ClassPage() {
  const { id } = useParams<{ id: string }>();
  const RK = `class:${id}`;
  const URL = `/api/classes/${id}`;

  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  async function reconcile() {
    const t = startTimer("page:class:reconcile");
    const { data } = await offline.fetchWithCache<Resp>({ resourceKey: RK, url: URL, onData: (j:any)=>j });
    t.end();
    setData(data || null);
  }

  useEffect(() => {
    offline.registerReconciler(RK, reconcile);
    let alive = true;
    (async () => {
      const t = startTimer("page:class:ttfb");
      try {
        const { data, fromCache } = await offline.fetchWithCache<Resp>({ resourceKey: RK, url: URL, onData: (j:any)=>j });
        if (!alive) return;
        setData(data || null);
        setFromCache(fromCache);
        recordTTFB("class", t.end(), { fromCache, offline: isOffline() });
      } catch (e) {
        recordPageError("class", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <p className="text-gray-500">Carregando turma…</p>
        <BackBar />
      </main>
    );
  }

  if (!data?.ok || !data.class) {
    return (
      <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center">
        <h1 className="text-2xl font-bold">Turma não encontrada</h1>
        <p className="text-gray-600 mt-2">Verifique o link ou suas permissões.</p>
        <div className="mt-6">
          <Link href="/classes" className="underline text-[var(--color-secondary,#0A66FF)]">Voltar para turmas</Link>
        </div>
        <BackBar />
      </main>
    );
  }

  const cls = data.class;

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col">
      <SyncBanner resourceKeys={[RK]} />

      <header className="mb-6">
        <h1 className="text-3xl font-extrabold">{cls.name}</h1>
        <p className="text-gray-600 mt-1">
          {fromCache ? "Exibindo dados em cache." : "Dados atualizados."}
          {data.lastLessonAt && ` • Última chamada: ${new Date(data.lastLessonAt).toLocaleDateString()}`}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href={`/classes/${cls.id}/chamadas`} className="group rounded-2xl border p-6 shadow bg-white hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-secondary,#0A66FF)]">
          <div className="text-xl font-bold mb-1">Chamadas</div>
          <p className="text-gray-600">Registrar presença por aula e acompanhar históricos.</p>
        </Link>
        <Link href={`/classes/${cls.id}/conteudos`} className="group rounded-2xl border p-6 shadow bg-white hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-secondary,#0A66FF)]">
          <div className="text-xl font-bold mb-1">Conteúdos</div>
          <p className="text-gray-600">Planejar e documentar conteúdos de cada aula.</p>
        </Link>
        <Link href={`/classes/${cls.id}/relatorios/chamadas`} className="group rounded-2xl border p-6 shadow bg-white hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-secondary,#0A66FF)]">
          <div className="text-xl font-bold mb-1">Relatório de Chamadas</div>
          <p className="text-gray-600">Exportar presença por período e ranking de ausentes.</p>
        </Link>
        <Link href={`/classes/${cls.id}/relatorios/conteudos`} className="group rounded-2xl border p-6 shadow bg-white hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-secondary,#0A66FF)]">
          <div className="text-xl font-bold mb-1">Relatório de Conteúdos</div>
          <p className="text-gray-600">Consolidar objetivos, recursos e BNCC por aula.</p>
        </Link>
      </section>

      <div className="mt-10" />
      <BackBar />
    </main>
  );
}
