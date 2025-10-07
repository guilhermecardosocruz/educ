"use client";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

let stack: string[] = [];

export function push(path: string) {
  if (typeof window === "undefined") return;
  const cur = window.location.pathname + window.location.search + window.location.hash;
  if (!stack.length || stack[stack.length - 1] !== cur) {
    stack.push(cur);
  }
}

export function back(router: AppRouterInstance) {
  if (canGoBack()) {
    stack.pop(); // remove atual
    const prev = stack.pop(); // remove alvo e navega
    if (prev) {
      router.push(prev);
      return;
    }
  }
  // fallback
  router.push("/");
}

export function canGoBack(): boolean {
  return stack.length > 0;
}

// Inicializa com a rota atual
if (typeof window !== "undefined") {
  push(window.location.pathname + window.location.search + window.location.hash);
  // Atualiza em navegações internas (heurística)
  window.addEventListener("popstate", () => {
    // o histórico do browser mudou; não controlamos aqui
  });
}
