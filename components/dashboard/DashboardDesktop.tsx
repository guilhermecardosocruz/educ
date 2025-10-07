"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as offline from "@/lib/offline";
import SyncBanner from "@/components/SyncBanner";

type ClassItem = {
  id: string;
  name: string;
  nextNo: number;
  createdAt: string;
  updatedAt: string;
};

type LessonLite = { id: string; number: number; title: string | null; createdAt: string };
type ContentItem = { id: string; title: string; createdAt?: string; lesson?: { number: number } | null };

const RK_CLASSES = "dashboard:classes";
const URL_CLASSES = "/api/classes";

export default function DashboardDesktop() {
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const [tab, setTab] = useState<"chamadas" | "conteudos">("chamadas");

  const RK_LESSONS = useMemo(() => (selectedId ? `dashboard:lessons:${selectedId}` : ""), [selectedId]);
  const RK_CONTENTS = useMemo(() => (selectedId ? `dashboard:contents:${selectedId}` : ""), [selectedId]);

  const URL_LESSONS = useMemo(
    () => (selectedId ? `/api/classes/${selectedId}/chamadas?page=1&pageSize=10&order=desc` : ""),
    [selectedId]
  );
  const URL_CONTENTS = useMemo(
    () => (selectedId ? `/api/classes/${selectedId}/conteudos` : ""),
    [selectedId]
  );

  const [lessons, setLessons] = useState<LessonLite[]>([]);
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [loadingMid, setLoadingMid] = useState(false);

  // Carrega turmas (lista esquerda)
  async function reconcileClasses() {
    const { data } = await offline.fetchWithCache<ClassItem[]>({
      resourceKey: RK_CLASSES,
      url: URL_CLASSES,
      onData: (j: any) => (j?.ok ? j.classes : [])
    });
    setClasses(data || []);
    if (!selectedId && (data?.[0]?.id)) setSelectedId(data[0].id);
  }

  useEffect(() => {
    offline.registerReconciler(RK_CLASSES, reconcileClasses);
    let alive = true;
    (async () => {
      const { data, fromCache } = await offline.fetchWithCache<ClassItem[]>({
        resourceKey: RK_CLASSES,
        url: URL_CLASSES,
        onData: (j: any) => (j?.ok ? j.classes : [])
      });
      if (!alive) return;
      setClasses(data || []);
      setFromCache(fromCache);
      if (!selectedId && data?.[0]?.id) setSelectedId(data[0].id);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carrega painel (direita) da turma ativa
  async function loadPanel() {
    if (!selectedId) return;
    setLoadingMid(true);
    try {
      // Carrega ambas para deixar cache pronto; exibe conforme aba
      const [L, C] = await Promise.all([
        offline.fetchWithCache<any>({ resourceKey: RK_LESSONS, url: URL_LESSONS, onData: (j:any)=>j }),
        offline.fetchWithCache<any>({ resourceKey: RK_CONTENTS, url: URL_CONTENTS, onData: (j:any)=>j }),
      ]);
      if (L?.data?.ok) setLessons(L.data.items || []);
      if (C?.data?.ok) setContents(C.data.items || []);
    } finally {
      setLoadingMid(false);
    }
  }

  useEffect(() => {
    void loadPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Em mobile, mantém navegação por telas: clique vai para /classes/[id]
  function onClassClick(id: string) {
    if (window.matchMedia && window.matchMedia("(max-width: 1023px)").matches) {
      router.push(`/classes/${id}`);
    } else {
      setSelectedId(id);
    }
  }

  return (
    <div className="hidden lg:grid grid-cols-[360px,1fr] gap-4 min-h-[calc(100vh-4rem)]">
      {/* Coluna esquerda (lista de turmas) */}
      <aside className="rounded-2xl border bg-white shadow-sm flex flex-col overflow-hidden">
        <div className="p-3 border-b">
          <div className="text-lg font-bold">Turmas</div>
          <div className="text-xs text-gray-600">{fromCache ? "cache" : "online"}</div>
        </div>
        <div className="px-3 pt-2">
          <SyncBanner resourceKeys={[RK_CLASSES]} />
        </div>
        <ul className="flex-1 overflow-y-auto p-2 space-y-1">
          {classes.length === 0 ? (
            <li className="text-sm text-gray-500 p-3">Nenhuma turma. Crie em <Link href="/classes" className="underline">/classes</Link></li>
          ) : classes.map((c) => {
            const active = c.id === selectedId;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onClassClick(c.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl border ${active ? "bg-[var(--color-secondary,#0A66FF)]/10 border-[var(--color-secondary,#0A66FF)]" : "bg-white hover:bg-gray-50"} transition`}
                >
                  <div className="font-medium truncate">{c.name}</div>
                  <div className="text-xs text-gray-500">Próx. nº: {c.nextNo}</div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* Painel direito (detalhes da turma ativa) */}
      <section className="rounded-2xl border bg-white shadow-sm flex flex-col">
        <div className="p-3 border-b flex items-center justify-between">
          <div>
            <div className="text-lg font-bold">Painel da turma</div>
            <div className="text-xs text-gray-600">Visualização rápida estilo WhatsApp</div>
          </div>
          {selectedId && (
            <Link href={`/classes/${selectedId}`} className="text-sm underline text-[var(--color-secondary,#0A66FF)]">
              Abrir turma
            </Link>
          )}
        </div>

        {selectedId ? (
          <>
            <div className="px-3 pt-2">
              <SyncBanner resourceKeys={[RK_LESSONS, RK_CONTENTS].filter(Boolean) as string[]} />
            </div>

            <div className="px-3">
              <div className="inline-flex rounded-xl border overflow-hidden mt-2">
                <button
                  className={`px-4 py-2 text-sm ${tab === "chamadas" ? "bg-[var(--color-secondary,#0A66FF)] text-white" : "bg-white"}`}
                  onClick={() => setTab("chamadas")}
                >
                  Chamadas
                </button>
                <button
                  className={`px-4 py-2 text-sm ${tab === "conteudos" ? "bg-[var(--color-secondary,#0A66FF)] text-white" : "bg-white"}`}
                  onClick={() => setTab("conteudos")}
                >
                  Conteúdos
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {loadingMid ? (
                <p className="text-gray-500">Carregando…</p>
              ) : tab === "chamadas" ? (
                lessons.length === 0 ? (
                  <div className="text-gray-600">Nenhuma chamada. <Link href={`/classes/${selectedId}/chamadas/new`} className="underline">Criar agora</Link>.</div>
                ) : (
                  <ul className="space-y-2">
                    {lessons.map((l) => (
                      <li key={l.id} className="rounded-xl border p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">#{l.number} — {l.title || "Sem título"}</div>
                          <Link href={`/classes/${selectedId}/chamadas/${l.id}`} className="text-sm underline text-[var(--color-secondary,#0A66FF)]">Abrir</Link>
                        </div>
                        <div className="text-xs text-gray-500">Criada em {new Date(l.createdAt).toLocaleDateString()}</div>
                      </li>
                    ))}
                  </ul>
                )
              ) : (
                contents.length === 0 ? (
                  <div className="text-gray-600">Nenhum conteúdo. <Link href={`/classes/${selectedId}/conteudos/new`} className="underline">Adicionar</Link>.</div>
                ) : (
                  <ul className="space-y-2">
                    {contents.map((c) => (
                      <li key={c.id} className="rounded-xl border p-3 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="font-semibold">Nº {c.lesson?.number ?? "—"} — {c.title || "Sem título"}</div>
                          <Link href={`/classes/${selectedId}/conteudos/${c.id}`} className="text-sm underline text-[var(--color-secondary,#0A66FF)]">Abrir</Link>
                        </div>
                        {c.createdAt && <div className="text-xs text-gray-500">Criado em {new Date(c.createdAt).toLocaleDateString()}</div>}
                      </li>
                    ))}
                  </ul>
                )
              )}
            </div>

            <div className="p-3 border-t flex gap-2 justify-end">
              <Link href={`/classes/${selectedId}/chamadas/new`} className="rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white hover:opacity-90">
                Nova chamada
              </Link>
              <Link href={`/classes/${selectedId}/conteudos/new`} className="rounded-xl px-4 py-2 font-medium border bg-white">
                Adicionar conteúdo
              </Link>
            </div>
          </>
        ) : (
          <div className="p-6 text-gray-600">Selecione uma turma na coluna esquerda.</div>
        )}
      </section>

      {/* Nota: em telas < lg, o /dashboard continua mostrando a UI mobile baseada em telas existentes (classes, chamadas, etc.) */}
    </div>
  );
}
