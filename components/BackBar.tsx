"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as nav from "@/lib/nav";

function isStandalonePWA(): boolean {
  if (typeof window === "undefined") return false;
  // Android/desktop: display-mode
  const dm = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  // iOS Safari
  const ios = (navigator as any)?.standalone === true;
  return !!(dm || ios);
}

async function logoutAndRedirect(router: ReturnType<typeof useRouter>) {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  router.replace("/login");
}

async function tryExitApp(router: ReturnType<typeof useRouter>) {
  if (isStandalonePWA()) {
    // Tenta fechar a janela do PWA
    window.close();
    // Se não fechar, faz logout e redireciona
    setTimeout(() => { void logoutAndRedirect(router); }, 200);
  } else {
    // Em contexto não-PWA, apenas logout + redirect
    await logoutAndRedirect(router);
  }
}

export default function BackBar() {
  const router = useRouter();
  const [showExit, setShowExit] = useState(false);
  const [canGoBack, setCanGoBack] = useState<boolean>(true);

  useEffect(() => {
    setCanGoBack(nav.canGoBack());
  }, []);

  function onBack() {
    if (nav.canGoBack()) {
      nav.back(router);
    } else {
      setShowExit(true);
    }
  }

  // A11y: foco inicial no modal
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (showExit) cancelRef.current?.focus();
  }, [showExit]);

  return (
    <>
      <div className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t z-40">
        <div className="max-w-3xl mx-auto px-3 py-2 flex items-center justify-between">
          <button
            onClick={onBack}
            className="btn-a11y border bg-white shadow-sm"
            aria-label={canGoBack ? "Voltar para a tela anterior" : "Sair do app"}
            title={canGoBack ? "Voltar" : "Sair do app"}
          >
            {canGoBack ? "Voltar" : "Sair"}
          </button>
          <div className="text-xs text-gray-600">
            {canGoBack ? "Navegação" : (isStandalonePWA() ? "PWA instalado" : "Navegador")}
          </div>
        </div>
      </div>

      {showExit && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowExit(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border bg-white p-4 shadow-lg">
            <h2 id="exit-title" className="text-lg font-semibold mb-1">Deseja sair?</h2>
            <p className="text-sm text-gray-700 mb-3">
              {isStandalonePWA()
                ? "Você está usando o app como PWA. Vamos tentar fechar a janela do app."
                : "Você está usando no navegador. Vamos encerrar a sessão e voltar ao login."}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                ref={cancelRef}
                className="btn-a11y border bg-white"
                onClick={() => setShowExit(false)}
              >
                Cancelar
              </button>
              <button
                className="btn-a11y shadow bg-[var(--color-secondary,#0A66FF)] text-white"
                onClick={() => { setShowExit(false); void tryExitApp(router); }}
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
