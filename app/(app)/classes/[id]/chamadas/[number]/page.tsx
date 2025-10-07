"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackBar from "@/components/BackBar";
import LessonForm from "@/components/lessons/LessonForm";

type Lesson = { id: string; classId: string; number: number; title: string | null; createdAt: string; content?: { id: string; title: string | null } | null };

export default function EditLessonPage() {
  const { id, number } = useParams<{ id: string; number: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/classes/${id}/lessons/${number}`, { cache: "no-store" });
        const j = await res.json();
        if (!res.ok || !j?.ok) throw new Error(j?.error || "Falha ao carregar chamada.");
        if (!alive) return;
        setLesson(j.lesson);
      } catch (e: any) {
        setErr(e?.message || "Erro ao carregar.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id, number]);

  return (
    <main className="min-h-[calc(100vh-4rem)] max-w-2xl mx-auto w-full p-3 flex flex-col">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Editar chamada</h1>
        <p className="text-gray-600 text-sm">Atualize o título e salve.</p>
      </header>

      {loading ? (
        <p className="text-gray-500">Carregando…</p>
      ) : err ? (
        <p className="text-red-700">{err}</p>
      ) : !lesson ? (
        <p className="text-gray-600">Chamada não encontrada.</p>
      ) : (
        <LessonForm
          classId={id}
          mode="edit"
          number={lesson.number}
          initialTitle={lesson.title}
          onSaved={(l) => router.replace(`/classes/${id}/chamadas`)}
        />
      )}

      <div className="mt-10" />
      <BackBar />
    </main>
  );
}
