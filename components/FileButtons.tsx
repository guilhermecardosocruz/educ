"use client";

import { useId, useRef, useState } from "react";
import Papa from "papaparse";

type UploadResult = {
  ok: boolean;
  inserted?: number;
  skipped?: number;
  message?: string;
  [k: string]: any;
};

type Props = {
  /** Links para templates (opcional) */
  templateCsvHref?: string;
  templateXlsxHref?: string;

  /** Aceite de tipos (default: ".csv,.xlsx") */
  accept?: string;

  /** Endpoint para POST automático.
   * Se informado:
   *  - CSV: envia { rows } já parseadas
   *  - XLSX: stub (mostra aviso) até implementação de XLSX
   */
  endpoint?: string;
  method?: "POST" | "PUT";

  /** Cabeçalhos extras para upload automático */
  headers?: Record<string, string>;

  /** Chamado com as linhas parseadas de um CSV (quando não usar endpoint, ou para inspeção extra) */
  onParsedRows?: (rows: any[]) => void | Promise<void>;

  /** Chamado quando upload automático terminar */
  onComplete?: (result: UploadResult) => void;

  /** Chamado em erros de parsing / upload */
  onError?: (err: unknown) => void;

  /** Rótulos (a11y/i18n) */
  labels?: {
    downloadCsv?: string;
    downloadXlsx?: string;
    upload?: string;
    chooseFile?: string;
    uploading?: string;
    parsing?: string;
    done?: string;
    error?: string;
  };

  /** Classe extra do wrapper */
  className?: string;
};

export default function FileButtons({
  templateCsvHref,
  templateXlsxHref,
  accept = ".csv,.xlsx",
  endpoint,
  method = "POST",
  headers,
  onParsedRows,
  onComplete,
  onError,
  labels = {},
  className = "",
}: Props) {
  const inputId = useId();
  const liveId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    downloadCsv: labels.downloadCsv ?? "Baixar template CSV",
    downloadXlsx: labels.downloadXlsx ?? "Baixar template XLSX",
    upload: labels.upload ?? "Enviar arquivo",
    chooseFile: labels.chooseFile ?? "Escolher arquivo…",
    uploading: labels.uploading ?? "Enviando…",
    parsing: labels.parsing ?? "Lendo arquivo…",
    done: labels.done ?? "Concluído",
    error: labels.error ?? "Erro",
  };

  const [status, setStatus] = useState<"idle" | "parsing" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);
  const [fileName, setFileName] = useState<string>("");

  function reset() {
    setStatus("idle");
    setMessage("");
    setProgress(0);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      try {
        setStatus("parsing");
        setMessage(t.parsing);
        setProgress(5);

        const rows = await parseCsv(file, (p) => setProgress(Math.max(5, Math.min(95, p))));
        setProgress(95);

        // Callback para inspeção
        if (onParsedRows) await onParsedRows(rows);

        if (endpoint) {
          setStatus("uploading");
          setMessage(t.uploading);
          const res = await postJson(endpoint, { rows }, { method, headers, onProgress: setProgress });
          setStatus(res.ok ? "done" : "error");
          setMessage(res.ok ? t.done : (res.message || t.error));
          if (onComplete) onComplete(res);
        } else {
          setStatus("done");
          setMessage(`${t.done} — ${rows.length} linha(s).`);
        }
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message || t.error);
        if (onError) onError(err);
      }
    } else if (ext === "xlsx" || ext === "xls") {
      // Stub de XLSX — pode ser substituído por SheetJS no futuro
      const msg = "Suporte a XLSX será adicionado em breve. Utilize CSV por enquanto.";
      setStatus("error");
      setMessage(msg);
      if (onError) onError(new Error(msg));
    } else {
      setStatus("error");
      setMessage("Tipo de arquivo não suportado. Use CSV ou XLSX.");
      if (onError) onError(new Error("Unsupported file"));
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        {templateCsvHref && (
          <a
            href={templateCsvHref}
            download
            className="rounded-xl px-4 py-2 font-medium border shadow-sm bg-white"
           title="Baixar template CSV">
            {t.downloadCsv}
          </a>
        )}
        {templateXlsxHref && (
          <a
            href={templateXlsxHref}
            download
            className="rounded-xl px-4 py-2 font-medium border shadow-sm bg-white"
           title="Baixar template XLSX">
            {t.downloadXlsx}
          </a>
        )}

        <label
          htmlFor={inputId}
          className="btn-a11y rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white cursor-pointer"
        >
          {t.upload}
        </label>
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="sr-only"
          aria-describedby={liveId}
        />
        <span className="text-sm text-gray-600">{fileName || t.chooseFile}</span>
      </div>

      {/* Barra de progresso simples */}
      {(status === "parsing" || status === "uploading") && (
        <div className="w-full max-w-md">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-2 bg-[var(--color-secondary,#0A66FF)] transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={status === "parsing" ? "Progresso de leitura" : "Progresso de envio"}
            />
          </div>
          <div className="mt-1 text-xs text-gray-600">{Math.round(progress)}%</div>
        </div>
      )}

      {/* Região de anúncio de estado (a11y) */}
      <div id={liveId} aria-live="polite" className="min-h-[1.5rem] text-sm" role="status">
        {status === "error" ? (
          <p className="text-red-600">{message}</p>
        ) : status === "done" ? (
          <p className="text-green-700">{message}</p>
        ) : (
          <p className="text-gray-700">{message}</p>
        )}
      </div>
    </div>
  );
}

/* ----------------- utils ----------------- */

function parseCsv(file: File, onProgress?: (pct: number) => void): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let rows: any[] = [];
    Papa.parse(file, {
      header: true,
      skipEmptyLines: "greedy",
      worker: true,
      step: () => {
        if (onProgress && file.size) {
          // Progress estimado — PapaParse não fornece bytes lidos, então estimativa simples
          // Mantemos incremento suave até ~90%
          const cur = Math.min(90, (rows.length % 1000) + 10);
          onProgress(cur);
        }
      },
      complete: (result) => {
        if (result.errors?.length) {
          const msg = result.errors.slice(0, 3).map((e) => e.message).join("; ");
        }
        rows = result.data as any[];
        resolve(rows);
      },
      error: (err) => reject(err)
    });
  });
}

async function postJson(url: string, body: any, opts?: { method?: string; headers?: Record<string, string>; onProgress?: (n:number)=>void }): Promise<UploadResult> {
  // fetch não suporta progresso nativo no upload; simulamos avanço
  const onp = opts?.onProgress;
  if (onp) {
    onp(96);
    setTimeout(() => onp(98), 150);
  }
  const res = await fetch(url, {
    method: opts?.method || "POST",
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) },
    body: JSON.stringify(body)
  });
  if (onp) onp(100);
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, ...json };
}
