"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import BackBar from "@/components/BackBar";

type NextNumberResp = { ok: boolean; nextNo: number };

export default function NewContentPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const classId = params.id;

  const qpNumber = search.get("number");
  const qpParsed = qpNumber ? parseInt(qpNumber, 10) : undefined;

  const [nextNo, setNextNo] = useState<number | null>(null);
  const [number, setNumber] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState(""); // markdown
  const [objetivos, setObjetivos] = useState("");
  const [desenvolvimento, setDesenvolvimento] = useState("");
  const [recursos, setRecursos] = useState("");
  const [bncc, setBncc] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Carrega número automático (nextNo), respeitando ?number=
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/classes/${classId}/next-number`, { cache: "no-store" });
        const json: NextNumberResp = await res.json();
        if (!alive) return;
        if (json?.ok && typeof json.nextNo === "number") {
          setNextNo(json.nextNo);
          setNumber(Number.isFinite(qpParsed!) ? (qpParsed as number) : json.nextNo);
        } else {
          setErr("Falha ao obter próximo número.");
        }
      } catch {
        if (alive) setErr("Erro de rede ao obter próximo número.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [classId, qpParsed]);

  const subtitle = useMemo(
    () => (number ? `Aula #${number}` : "Defina o número da aula"),
    [number]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const n = typeof number === "number" ? number : parseInt(String(number || 0), 10);
    if (!Number.isFinite(n) || n <= 0) {
      setErr("Número da aula inválido.");
      return;
    }
    if (!title.trim() || !text.trim()) {
      setErr("Título e Conteúdo (markdown) são obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/classes/${classId}/conteudos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: n,
          title: title.trim(),
          text: text,
          objetivos: objetivos || null,
          desenvolvimento: desenvolvimento || null,
          recursos: recursos || null,
          bncc: bncc || null
        })
      });

      const json = await res.json();
      if (!json?.ok) {
        setErr(json?.error || "Não foi possível salvar o conteúdo.");
        setSaving(false);
        return;
      }

      setMsg("Conteúdo salvo com sucesso.");
      router.replace(`/classes/${classId}/conteudos`);
      router.refresh();
    } catch {
      setErr("Erro de rede ao salvar o conteúdo.");
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Adicionar conteúdo</h1>
        <p className="text-gray-600">{subtitle}</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium">Número da aula</label>
            <input
              type="number"
              min={1}
              value={number}
              onChange={(e) => setNumber(e.target.value === "" ? "" : parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded-md border p-2"
              disabled={loading || saving}
            />
            {nextNo && (
              <p className="text-xs text-gray-500 mt-1">Sugerido: {nextNo}</p>
            )}
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Título</label>
            <input
              type="text"
              placeholder={nextNo ? `Aula ${nextNo}: título do conteúdo` : "Título do conteúdo"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              disabled={loading || saving}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Conteúdo (markdown)</label>
          <textarea
            placeholder="Escreva o conteúdo em markdown..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="mt-1 w-full rounded-md border p-2 h-40"
            disabled={loading || saving}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Objetivos</label>
            <textarea
              value={objetivos}
              onChange={(e) => setObjetivos(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 h-24"
              disabled={saving}
              placeholder="Quais objetivos pedagógicos?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Desenvolvimento</label>
            <textarea
              value={desenvolvimento}
              onChange={(e) => setDesenvolvimento(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 h-24"
              disabled={saving}
              placeholder="Como a aula será conduzida?"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Recursos didáticos</label>
            <textarea
              value={recursos}
              onChange={(e) => setRecursos(e.target.value)}
              className="mt-1 w-full rounded-md border p-2 h-24"
              disabled={saving}
              placeholder="Materiais, ferramentas, etc."
            />
          </div>
          <div>
            <label className="block text-sm font-medium">BNCC</label>
            <input
              type="text"
              value={bncc}
              onChange={(e) => setBncc(e.target.value)}
              className="mt-1 w-full rounded-md border p-2"
              disabled={saving}
              placeholder="Ex.: EF08LP01, EF08LP02..."
            />
          </div>
        </div>

        <div aria-live="polite" className="min-h-[1.5rem] text-sm">
          {err && <p className="text-red-600">{err}</p>}
          {msg && <p className="text-green-700">{msg}</p>}
        </div>

        <div className="flex gap-3">
          <button
             type="submit" className="btn-a11y rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white"
            disabled={saving || loading}
            className="rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70"
          >
            {saving ? "Salvando..." : "Salvar conteúdo"}
          </button>
          <button
             type="button" className="btn-a11y border bg-white"
            onClick={() => router.back()}
            className="rounded-xl px-4 py-2 border shadow-sm bg-white"
          >
            Cancelar
          </button>
        </div>
      </form>

      <div className="mt-10" />
      <BackBar />
    </main>
  );
}
