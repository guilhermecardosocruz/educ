"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BackBar from "@/components/BackBar";
import SyncBanner from "@/components/SyncBanner";
import * as offline from "@/lib/offline";

type ClassItem = {
  id: string;
  name: string;
  nextNo: number;
  createdAt: string;
  updatedAt: string;
};
type ClassMetaResp = {
  ok: boolean;
  class: {
    id: string;
    name: string;
    nextNo: number;
    createdAt: string;
    updatedAt: string;
  };
  counts: { students: number; lessons: number; contents: number };
  lastLessonAt: string | null;
};
type LessonLite = { id: string; number: number; title: string | null; createdAt: string; classId?: string; className?: string };
type ContentLite = { id: string; title: string; createdAt?: string; lesson?: { number: number } | null; classId?: string; className?: string };

const RK_CLASSES = "classes:list";
const URL_CLASSES = "/api/classes";

export default function GestorPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [fromCache, setFromCache] = useState(false);

  const [sumStudents, setSumStudents] = useState(0);
  const [sumLessons, setSumLessons] = useState(0);
  const [sumContents, setSumContents] = useState(0);

  const [recentLessons, setRecentLessons] = useState<LessonLite[]>([]);
  const [recentContents, setRecentContents] = useState<ContentLite[]>([]);

  // Reconciliadores
  async function reconcileClasses() {
    const { data } = await offline.fetchWithCache<ClassItem[]>({
      resourceKey: RK_CLASSES,
      url: URL_CLASSES,
      onData: (j: any) => (j?.ok ? j.classes : [])
    });
    setClasses(data || []);
  }

  useEffect(() => {
    offline.registerReconciler(RK_CLASSES, reconcileClasses);
    let alive = true;
    (async () => {
      // 1) Carrega turmas do cache+servidor
      const { data, fromCache } = await offline.fetchWithCache<ClassItem[]>({
        resourceKey: RK_CLASSES,
        url: URL_CLASSES,
        onData: (j: any) => (j?.ok ? j.classes : [])
      });
      if (!alive) return;
      const cls = data || [];
      setClasses(cls);
      setFromCache(fromCache);

      // 2) Para até N turmas, carrega contagens rápidas e últimas chamadas/conteúdos
      const N = 6;
      const pick = cls.slice(0, N);

      // Carrega metadados por turma (contagens)
      const metaPromises = pick.map(async (c) => {
        const RK = `class:${c.id}`;
        const URL = `/api/classes/${c.id}`;
        const { data } = await offline.fetchWithCache<ClassMetaResp>({
          resourceKey: RK,
          url: URL,
          onData: (j: any) => j
        });
        return { id: c.id, name: c.name, counts: data?.counts ?? { students: 0, lessons: 0, contents: 0 } };
      });

      // Carrega últimas chamadas e conteúdos (limites via query / slice)
      const lastLessonsPromises = pick.map(async (c) => {
        const RK = `lessons:${c.id}:p1:s5:odesc`;
        const URL = `/api/classes/${c.id}/chamadas?page=1&pageSize=5&order=desc`;
        const { data } = await offline.fetchWithCache<any>({ resourceKey: RK, url: URL, onData: (j:any)=>j });
        const items: LessonLite[] = (data?.items || []).map((l: any) => ({ ...l, classId: c.id, className: c.name }));
        return items;
      });

      const lastContentsPromises = pick.map(async (c) => {
        const RK = `contents:${c.id}`;
        const URL = `/api/classes/${c.id}/conteudos`;
        const { data } = await offline.fetchWithCache<any>({ resourceKey: RK, url: URL, onData: (j:any)=>j });
        const items: ContentLite[] = (data?.items || []).slice(0, 5).map((ct: any) => ({ ...ct, classId: c.id, className: c.name }));
        return items;
      });

      const metas = await Promise.all(metaPromises);
      const L = (await Promise.all(lastLessonsPromises)).flat();
      const C = (await Promise.all(lastContentsPromises)).flat();

      if (!alive) return;

      // Agregados
      setSumStudents(metas.reduce((acc, m) => acc + (m.counts.students || 0), 0));
      setSumLessons(metas.reduce((acc, m) => acc + (m.counts.lessons || 0), 0));
      setSumContents(metas.reduce((acc, m) => acc + (m.counts.contents || 0), 0));

      // Ordena por createdAt desc e limita
      L.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      C.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setRecentLessons(L.slice(0, 8));
      setRecentContents(C.slice(0, 8));

      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const totalClasses = classes.length;

  const rkAll: string[] = useMemo(() => {
    const keys = [RK_CLASSES];
    classes.slice(0, 6).forEach((c) => {
      keys.push(`class:${c.id}`, `lessons:${c.id}:p1:s5:odesc`, `contents:${c.id}`);
    });
    return keys;
  }, [classes]);

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col">
      <SyncBanner resourceKeys={rkAll} />

      <header className="mb-6">
        <h1 className="text-2xl font-bold">Gestor — Visão Geral</h1>
        <p className="text-gray-600 text-sm">{fromCache ? "Exibindo dados em cache." : "Dados atualizados."}</p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat title="Turmas" value={loading ? "…" : String(totalClasses)} href="/classes" />
        <Stat title="Alunos" value={loading ? "…" : String(sumStudents)} />
        <Stat title="Chamadas" value={loading ? "…" : String(sumLessons)} />
        <Stat title="Conteúdos" value={loading ? "…" : String(sumContents)} />
      </section>

      <section className="grid lg:grid-cols-2 gap-4">
        <Card title="Últimas chamadas" action={!loading && <Link className="text-sm underline" href="/classes">Ver turmas</Link>}>
          {loading ? (
            <p className="text-gray-500">Carregando…</p>
          ) : recentLessons.length === 0 ? (
            <p className="text-gray-600">Nenhuma chamada recente.</p>
          ) : (
            <ul className="divide-y">
              {recentLessons.map((l) => (
                <li key={l.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">#{l.number} — {l.title || "Sem título"}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {l.className} • {new Date(l.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Link href={`/classes/${l.classId}/chamadas/${l.id}`} className="text-sm underline text-[var(--color-secondary,#0A66FF)]">Abrir</Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Últimos conteúdos" action={!loading && <Link className="text-sm underline" href="/classes">Ver turmas</Link>}>
          {loading ? (
            <p className="text-gray-500">Carregando…</p>
          ) : recentContents.length === 0 ? (
            <p className="text-gray-600">Nenhum conteúdo recente.</p>
          ) : (
            <ul className="divide-y">
              {recentContents.map((c) => (
                <li key={c.id} className="py-3">
                  <div className="font-medium truncate">
                    {c.title || "Sem título"} {c.lesson?.number != null && <span className="text-xs text-gray-500">• Nº {c.lesson.number}</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {c.className} • {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                  </div>
                  <div className="mt-1">
                    <Link href={`/classes/${c.classId}/conteudos/${c.id}`} className="text-sm underline text-[var(--color-secondary,#0A66FF)]">Abrir</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <div className="mt-10" />
      <BackBar />
    </main>
  );
}

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </article>
  );
}

function Stat({ title, value, href }: { title: string; value: string; href?: string }) {
  const inner = (
    <div className="rounded-2xl border p-4 bg-white shadow-sm">
      <div className="text-gray-500 text-sm">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
