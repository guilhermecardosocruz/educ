"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as offline from "@/lib/offline";

type Props = {
  classId: string;
  mode: "new" | "edit";
  number?: number; // necessário no modo edit
  initialTitle?: string | null;
  suggestedTitle?: string | null;
  onSaved?: (lesson: { id: string; number: number; title: string | null }) => void;
};

export default function LessonForm({ classId, mode, number, initialTitle = "", suggestedTitle, onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState<string>(initialTitle || suggestedTitle || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const actionLabel = useMemo(() => (mode === "new" ? "Salvar chamada" : "Salvar alterações"), [mode]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    setLoading(true);
    try {
      if (mode === "new") {
        const res = await fetch(`/api/classes/${classId}/chamadas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, expectedNumber: await getExpectedNumber() })
        });
        const j = await res.json();
        if (!res.ok || !j?.ok) throw new Error(j?.error || "Falha ao criar chamada.");
        if (j?.message) setMsg(j.message);
        onSaved?.(j.lesson);
      } else {
        if (typeof number !== "number") throw new Error("Número da chamada indisponível.");
        const res = await fetch(`/api/classes/${classId}/lessons/${number}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title })
        });
        const j = await res.json();
        if (!res.ok || !j?.ok) throw new Error(j?.error || "Falha ao salvar alterações.");
        onSaved?.(j.lesson);
        setMsg("Chamada atualizada.");
      }
    } catch (e: any) {
      setErr(e?.message || "Erro ao salvar.");
    } finally {
      setLoading(false);
      // marca recursos para reconciliar em listagens
      offline.markDirtyAndRefetch(`lessons:${classId}:p1:s10:odesc`).catch(()=>{});
    }
  }

  async function getExpectedNumber(): Promise<number | null> {
    try {
      const res = await fetch(`/api/classes/${classId}/chamadas/next-number`, { cache: "no-store" });
      const j = await res.json();
      return j?.nextNo ?? null;
    } catch { return null; }
  }

  return (
    <form onSubmit={onSubmit} noValidate aria-describedby="lesson-live">
      <div className="mb-4">
        <label htmlFor="title" className="block font-medium">Título da chamada</label>
        <input
          ref={inputRef}
          id="title"
          type="text"
          placeholder="Ex.: Revisão do conteúdo 5"
          value={title}
          onChange={(e)=>setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border p-3"
        />
        {suggestedTitle && !title && (
          <p className="text-xs text-gray-600 mt-1">Sugestão: “{suggestedTitle}”.</p>
        )}
      </div>

      <div id="lesson-live" aria-live="polite" className="min-h-[1.5rem] text-sm mb-2">
        {err && <p className="text-red-700">{err}</p>}
        {msg && <p className="text-green-700">{msg}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-a11y shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70"
      >
        {loading ? "Salvando…" : actionLabel}
      </button>
    </form>
  );
}
