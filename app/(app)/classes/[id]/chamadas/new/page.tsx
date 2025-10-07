"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import BackBar from "@/components/BackBar";
import LessonForm from "@/components/lessons/LessonForm";

export default function NewLessonPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [suggest, setSuggest] = useState<string | null>(null);

  // Sugere título a partir do conteúdo N (se existir)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const nRes = await fetch(`/api/classes/${id}/chamadas/next-number`, { cache: "no-store" });
        const nJ = await nRes.json();
        const n = nJ?.nextNo;
        if (!n) return;
        const cRes = await fetch(`/api/classes/${id}/conteudos/${n}`, { cache: "no-store" });
        const cJ = await cRes.json().catch(()=>null);
        if (alive && cJ?.ok && cJ?.content?.title) {
          setSuggest(cJ.content.title);
        }
      } catch {}
    })();
    return () => { alive = false; };
  }, [id]);

  return (
    <main className="min-h-[calc(100vh-4rem)] max-w-2xl mx-auto w-full p-3 flex flex-col">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Nova chamada</h1>
        <p className="text-gray-600 text-sm">Crie a chamada e vincule ao conteúdo automaticamente, se existir.</p>
      </header>

      <LessonForm
        classId={id}
        mode="new"
        suggestedTitle={suggest}
        onSaved={(l) => router.replace(`/classes/${id}/chamadas`)}
      />

      <div className="mt-10" />
      <BackBar />
    </main>
  );
}
