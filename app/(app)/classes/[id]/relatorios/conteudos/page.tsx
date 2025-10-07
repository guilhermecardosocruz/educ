"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import BackBar from "@/components/BackBar";

type Item = {
  id: string;
  title: string;
  objetivos: string | null;
  summary: string | null;
  createdAt: string;
  lessonNumber: number | null;
};
type Resp = {
  ok: boolean;
  meta: {
    classId: string;
    className: string;
    range: { start: string; end: string };
    total: number;
  };
  items: Item[];
};

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function ContentsReportPage() {
  const { id } = useParams<{ id: string }>();
  const today = new Date();
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);

  const [start, setStart] = useState(fmtDate(d30));
  const [end, setEnd] = useState(fmtDate(today));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Resp | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/classes/${id}/reports/contents?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { cache: "no-store" });
      const j: Resp = await res.json();
      if (!j?.ok) throw new Error((j as any)?.error || "Falha ao carregar relatório.");
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Erro de rede ao gerar relatório.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    load();
  }

  function exportPDF() {
    window.print();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* CSS Print-friendly */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          body { background: white !important; }
          header, .no-print { display: none !important; }
          .report-card { box-shadow: none !important; border-color: #ddd !important; }
          .report-title { margin-top: 0 !important; }
          .card { break-inside: avoid; }
        }
      `}</style>

      <header className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold">Relatório de Conteúdos</h1>
        <p className="text-gray-600 text-sm">Listagem por período com resumos</p>
      </header>

      <section className="no-print mb-4">
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium">Data inicial</label>
            <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="mt-1 rounded-md border p-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium">Data final</label>
            <input type="date" value={end} onChange={(e)=>setEnd(e.target.value)} className="mt-1 rounded-md border p-2" required />
          </div>
          <button type="submit" className="rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white">
            Gerar
          </button>
          <button type="button" onClick={exportPDF} className="rounded-xl px-4 py-2 font-medium border bg-white">
            Exportar PDF
          </button>
        </form>
      </section>

      <section className="flex-1">
        {loading ? (
          <p className="text-gray-500">Gerando relatório…</p>
        ) : err ? (
          <p className="text-red-600">{err}</p>
        ) : !data ? (
          <p className="text-gray-600">Sem dados.</p>
        ) : (
          <div className="space-y-4">
            <article className="report-card rounded-2xl border p-4 bg-white shadow-sm">
              <h2 className="report-title text-xl font-bold">Resumo — {data.meta.className}</h2>
              <p className="text-sm text-gray-600">
                Período: <strong>{new Date(data.meta.range.start).toLocaleDateString()}</strong> a{" "}
                <strong>{new Date(data.meta.range.end).toLocaleDateString()}</strong>
              </p>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div className="rounded-xl border p-3 bg-gray-50">
                  <div className="text-gray-500">Conteúdos no período</div>
                  <div className="text-lg font-semibold">{data.meta.total}</div>
                </div>
              </div>
            </article>

            <article className="report-card rounded-2xl border p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Conteúdos</h3>
              {data.items.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhum conteúdo registrado no intervalo informado.</p>
              ) : (
                <ul className="grid gap-3">
                  {data.items.map((c) => (
                    <li key={c.id} className="card rounded-xl border p-4 bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            {c.title || "Sem título"} {c.lessonNumber != null && <span className="text-xs text-gray-500">• Nº {c.lessonNumber}</span>}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(c.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {c.objetivos && (
                        <div className="mt-2">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Objetivos</div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.objetivos}</p>
                        </div>
                      )}
                      {c.summary && (
                        <div className="mt-2">
                          <div className="text-xs uppercase tracking-wide text-gray-500">Resumo</div>
                          <p className="text-sm text-gray-800 whitespace-pre-wrap">{c.summary}</p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        )}
      </section>

      <div className="mt-10" />
      <BackBar />
    </main>
  );
}
