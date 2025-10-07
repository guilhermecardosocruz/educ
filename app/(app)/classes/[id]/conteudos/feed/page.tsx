"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackBar from "@/components/BackBar";

type ContentItem = {
  id: string;
  title: string;
  createdAt?: string;
  text?: string | null;
  objetivos?: string | null;
  lesson?: { number: number } | null;
};

export default function ContentsFeedPage() {
  const { id } = useParams<{ id: string }>();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, { text: string; loading: boolean; error?: string }>>({});

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/classes/${id}/conteudos`, { cache: "no-store" });
      const j = await res.json();
      if (!j?.ok) throw new Error(j?.error || "Falha ao carregar conteúdos.");
      setItems(j.items || []);
    } catch (e: any) {
      setErr(e?.message || "Erro de rede.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  async function generateSummary(item: ContentItem) {
    const key = item.id;
    setSummaries((m) => ({ ...m, [key]: { text: "", loading: true } }));
    try {
      // Preferimos text, ou combinamos campos para o stub
      const base = [item.title, item.objetivos, item.text].filter(Boolean).join(". ");
      const res = await fetch("/api/ai/summarize-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: base })
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) throw new Error(j?.error || "Falha ao gerar resumo.");
      setSummaries((m) => ({ ...m, [key]: { text: j.summary, loading: false } }));
    } catch (e: any) {
      setSummaries((m) => ({ ...m, [key]: { text: "", loading: false, error: e?.message || "Erro" } }));
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] p-3">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Feed de conteúdos</h1>
        <p className="text-gray-600 text-sm">Estilo Instagram — com resumo por IA (stub).</p>
      </header>

      {loading ? (
        <p className="text-gray-500">Carregando…</p>
      ) : err ? (
        <p className="text-red-700">{err}</p>
      ) : items.length === 0 ? (
        <p className="text-gray-600">Nenhum conteúdo.</p>
      ) : (
        <ul className="grid gap-4 max-w-2xl mx-auto">
          {items.map((c) => {
            const s = summaries[c.id];
            return (
              <li key={c.id} className="rounded-2xl border bg-white shadow-sm overflow-hidden">
                {/* Placeholder de imagem/banner */}
                <div className="h-40 w-full bg-[var(--color-secondary,#0A66FF)]/10 flex items-center justify-center">
                  <div className="text-sm text-[var(--color-secondary,#0A66FF)]">Imagem do conteúdo</div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">
                        {c.title || "Sem título"} {c.lesson?.number != null && <span className="text-xs text-gray-500">• Nº {c.lesson.number}</span>}
                      </div>
                      <div className="text-xs text-gray-500">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => generateSummary(c)}
                      disabled={!!s?.loading}
                      className="btn-a11y shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70"
                      aria-busy={s?.loading ? "true" : "false"}
                      aria-label={`Gerar resumo por IA para ${c.title || "conteúdo"}`}
                    >
                      {s?.loading ? "Gerando…" : "Gerar resumo por IA"}
                    </button>
                  </div>

                  {c.objetivos && (
                    <div className="mt-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Objetivos</div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.objetivos}</p>
                    </div>
                  )}

                  {/* Trecho do conteúdo */}
                  {c.text && (
                    <div className="mt-3">
                      <div className="text-xs uppercase tracking-wide text-gray-500">Trecho</div>
                      <p className="text-sm text-gray-800 line-clamp-3 whitespace-pre-wrap">
                        {c.text.replace(/```[\s\S]*?```/g, "").slice(0, 420)}{c.text.length > 420 ? "…" : ""}
                      </p>
                    </div>
                  )}

                  {/* Resumo por IA (stub) */}
                  <div className="mt-3" aria-live="polite">
                    {s?.error ? (
                      <p className="text-sm text-red-700">{s.error}</p>
                    ) : s?.text ? (
                      <div className="rounded-xl border p-3 bg-gray-50">
                        <div className="text-xs uppercase tracking-wide text-gray-500">Resumo por IA (demo)</div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{s.text}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10" />
      <BackBar />
    </main>
  );
}
