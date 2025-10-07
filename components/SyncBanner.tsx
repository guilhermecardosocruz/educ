"use client";

import { useEffect, useMemo, useState } from "react";
import * as offline from "@/lib/offline";

type Props = {
  /** Lista de resourceKeys relevantes para a página */
  resourceKeys: string[];
  /** Força estado de pendência extra (opcional) */
  extraPending?: boolean;
  /** Intervalo de verificação em ms (default 2000ms) */
  pollMs?: number;
};

export default function SyncBanner({ resourceKeys, extraPending = false, pollMs = 2000 }: Props) {
  const [online, setOnline] = useState<boolean>(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [pending, setPending] = useState<boolean>(false);
  const [recentlySynced, setRecentlySynced] = useState<boolean>(false);

  async function refreshPending() {
    const states = await Promise.all(resourceKeys.map((k) => offline.getPendingState(k)));
    const anyPending = states.some(Boolean) || extraPending;
    setPending(anyPending);
    if (online && !anyPending) {
      setRecentlySynced(true);
      const t = setTimeout(() => setRecentlySynced(false), 2000);
      return () => clearTimeout(t);
    }
  }

  useEffect(() => {
    refreshPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKeys.join("|"), online, extraPending]);

  useEffect(() => {
    function onOn() {
      setOnline(true);
      // ao voltar conexão, tenta processar fila
      void offline.processQueue().then(refreshPending);
    }
    function onOff() {
      setOnline(false);
    }
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    const id = setInterval(() => {
      // apenas verifica pendências quando online, para reduzir ruído
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void refreshPending();
      }
    }, pollMs);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, resourceKeys.join("|")]);

  const state: "offline" | "syncing" | "ok" = useMemo(() => {
    if (!online) return "offline";
    if (pending) return "syncing";
    return "ok";
  }, [online, pending]);

  const text = state === "offline" ? "Offline" : state === "syncing" ? "Sincronizando…" : "Tudo atualizado";
  const bg =
    state === "offline" ? "bg-gray-800 text-white"
    : state === "syncing" ? "bg-amber-100 text-amber-800"
    : "bg-green-100 text-green-800";

  // banner discreto, colado no topo da região principal
  return (
    <div className={`sticky top-0 z-30 ${bg} px-3 py-1 text-sm rounded-md border mb-3`}>
      <div className="flex items-center gap-2">
        {state === "offline" && <span aria-hidden>⚠️</span>}
        {state === "syncing" && <span aria-hidden>⏳</span>}
        {state === "ok" && recentlySynced && <span aria-hidden>✅</span>}
        <span role="status" aria-live="polite">{text}</span>
        {state !== "ok" && (
          <button
            type="button"
            onClick={() => offline.processQueue().then(refreshPending)}
            className="ml-auto underline"
          >
            Forçar sincronização
          </button>
        )}
      </div>
    </div>
  );
}
