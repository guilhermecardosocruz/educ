"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import BackBar from "@/components/BackBar";

type Lesson = { id: string; number: number; title: string | null; createdAt: string };
type PerStudent = {
  studentId: string;
  studentName: string;
  presents: number | null;
  absences: number | null;
  attendancePct: number | null;
};
type Report = {
  ok: boolean;
  meta: {
    classId: string;
    className: string;
    range: { start: string; end: string };
    lessonsCount: number;
    studentsCount: number;
    attendanceDataAvailable: boolean;
  };
  lessons: Lesson[];
  perStudent: PerStudent[];
};

function fmtDate(d: Date) {
  return d.toISOString().slice(0,10);
}

export default function AttendanceReportPage() {
  const { id } = useParams<{ id: string }>();
  const today = new Date();
  const d30 = new Date(); d30.setDate(d30.getDate() - 30);

  const [start, setStart] = useState(fmtDate(d30));
  const [end, setEnd] = useState(fmtDate(today));
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Report | null>(null);

  const ranking = useMemo(() => {
    if (!data?.perStudent?.length) return [];
    // Ordena por ausências desc (null -> 0)
    const safe = data.perStudent.map(s => ({
      ...s,
      _abs: s.absences ?? 0,
      _pct: s.attendancePct ?? 0
    }));
    safe.sort((a,b) => b._abs - a._abs || a.studentName.localeCompare(b.studentName));
    return safe;
  }, [data]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/classes/${id}/reports/attendance?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { cache: "no-store" });
      const j: Report = await res.json();
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
    // Tip: a UI já é print-friendly; usar "Salvar como PDF"
    window.print();
  }

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* CSS de impressão (print-friendly) */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 14mm; }
          body { background: white !important; }
          header, .no-print { display: none !important; }
          .report-card { box-shadow: none !important; border-color: #ddd !important; }
          .report-title { margin-top: 0 !important; }
          .table { page-break-inside: auto; }
          .table tr { page-break-inside: avoid; page-break-after: auto; }
        }
      `}</style>

      <header className="mb-6 print:hidden">
        <h1 className="text-2xl font-bold">Relatório de Chamadas</h1>
        <p className="text-gray-600 text-sm">Período e ranking de ausências</p>
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
                  <div className="text-gray-500">Aulas no período</div>
                  <div className="text-lg font-semibold">{data.meta.lessonsCount}</div>
                </div>
                <div className="rounded-xl border p-3 bg-gray-50">
                  <div className="text-gray-500">Alunos</div>
                  <div className="text-lg font-semibold">{data.meta.studentsCount}</div>
                </div>
                <div className="rounded-xl border p-3 bg-gray-50">
                  <div className="text-gray-500">Frequência média</div>
                  <div className="text-lg font-semibold">
                    {data.meta.attendanceDataAvailable ? "~" : "—"}
                  </div>
                </div>
                <div className="rounded-xl border p-3 bg-gray-50">
                  <div className="text-gray-500">Dados de presença</div>
                  <div className="text-lg font-semibold">
                    {data.meta.attendanceDataAvailable ? "Disponível" : "Indisponível"}
                  </div>
                </div>
              </div>
              {!data.meta.attendanceDataAvailable && (
                <p className="mt-2 text-xs text-amber-700">
                  Observação: O banco atual não possui registros de presença por aluno. O ranking abaixo é ilustrativo e
                  ficará completo quando a camada de presença for implementada.
                </p>
              )}
            </article>

            <article className="report-card rounded-2xl border p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Ranking de ausentes</h3>
              <div className="overflow-auto">
                <table className="table min-w-[560px] w-full border-collapse">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-2">#</th>
                      <th className="py-2 pr-2">Aluno</th>
                      <th className="py-2 pr-2">Presenças</th>
                      <th className="py-2 pr-2">Ausências</th>
                      <th className="py-2 pr-2">% Frequência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-3 text-gray-500">Sem dados de presença para o período.</td>
                      </tr>
                    ) : (
                      ranking.map((s, i) => (
                        <tr key={s.studentId} className="border-b last:border-0">
                          <td className="py-2 pr-2 w-10">{i + 1}</td>
                          <td className="py-2 pr-2">{s.studentName}</td>
                          <td className="py-2 pr-2">{s.presents ?? "—"}</td>
                          <td className="py-2 pr-2">{s.absences ?? "—"}</td>
                          <td className="py-2 pr-2">{s.attendancePct != null ? `${s.attendancePct.toFixed(1)}%` : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="report-card rounded-2xl border p-4 bg-white shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Aulas no período</h3>
              {data.lessons.length === 0 ? (
                <p className="text-gray-600 text-sm">Nenhuma aula registrada no intervalo informado.</p>
              ) : (
                <ul className="grid gap-2">
                  {data.lessons.map(l => (
                    <li key={l.id} className="rounded-xl border p-3 bg-gray-50">
                      <div className="font-medium">#{l.number} — {l.title || "Sem título"}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </div>
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
