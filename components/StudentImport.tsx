"use client";

import { useState } from "react";
import Papa from "papaparse";

type Props = {
  classId: string;
  onImported?: (summary: { inserted: number; skipped: number }) => void;
};

type Row = { name?: string; cpf?: string; contact?: string };

function onlyDigits(v?: string) {
  return (v || "").replace(/\D+/g, "");
}

export default function StudentImport({ classId, onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function handleTemplate(kind: "csv" | "xlsx") {
    const url = kind === "csv"
      ? "/templates/students-template.csv"
      : "/templates/students-template.xlsx";
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-template.${kind}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setMsg(null);
    setErr(null);
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      setBusy(true);
      try {
        const parsed = await new Promise<Row[]>((resolve, reject) => {
          Papa.parse<Row>(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().toLowerCase(),
            complete: (res) => resolve((res.data || []) as Row[]),
            error: (err) => reject(err)
          });
        });

        // Normaliza e valida
        const rows = parsed
          .map((r) => ({
            name: (r.name || "").trim(),
            cpf: onlyDigits(r.cpf),
            contact: (r.contact || "").trim()
          }))
          .filter((r) => r.name.length >= 2);

        if (rows.length === 0) {
          setErr("Nenhuma linha válida encontrada (campo 'name' é obrigatório).");
          setBusy(false);
          return;
        }

        const res = await fetch(`/api/classes/${classId}/students/import`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows })
        });
        const json = await res.json();
        if (!json?.ok) {
          setErr(json?.error || "Falha ao importar.");
        } else {
          const { inserted = 0, skipped = 0 } = json;
          setMsg(`Importação concluída: ${inserted} inserido(s), ${skipped} ignorado(s).`);
          onImported?.({ inserted, skipped });
        }
      } catch (e: any) {
        setErr(e?.message || "Erro ao processar CSV.");
      } finally {
        setBusy(false);
      }
    } else if (ext === "xlsx" || ext === "xls") {
      setErr("Importação via XLSX estará disponível em breve. Use o template CSV por enquanto.");
    } else {
      setErr("Formato não suportado. Envie um arquivo .csv (ou .xlsx futuramente).");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={onFile}
          disabled={busy}
          className="block"
          aria-label="Importar alunos por arquivo CSV/XLSX"
        />
        <button
          type="button"
          onClick={() => handleTemplate("csv")}
          className="rounded-md border px-3 py-1 text-sm bg-white"
        >
          Baixar template CSV
        </button>
        <button
          type="button"
          onClick={() => handleTemplate("xlsx")}
          className="rounded-md border px-3 py-1 text-sm bg-white"
        >
          Baixar template XLSX
        </button>
      </div>
      <div aria-live="polite" className="min-h-[1.5rem] text-sm">
        {busy && <span className="text-gray-600">Processando…</span>}
        {msg && <span className="text-green-700">{msg}</span>}
        {err && <span className="text-red-600">{err}</span>}
      </div>
    </div>
  );
}
