"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DashboardDesktop from "@/components/dashboard/DashboardDesktop";
import BackBar from "@/components/BackBar";

export default function DashboardPage() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return (
    <main className="min-h-[calc(100vh-4rem)] p-3">
      {/* Desktop (>= lg): layout tipo WhatsApp */}
      {isDesktop ? (
        <>
          <h1 className="sr-only">Dashboard</h1>
          <DashboardDesktop />
        </>
      ) : (
        /* Mobile: mantém navegação por telas independentes (experiência atual) */
        <section className="max-w-md mx-auto">
          <header className="mb-6">
            <h1 className="text-2xl font-bold">EDUC</h1>
            <p className="text-gray-600">Acesse suas turmas e recursos.</p>
          </header>
          <div className="grid gap-3">
            <Link href="/classes" className="rounded-2xl border p-6 shadow-sm bg-white">
              <div className="text-xl font-bold">Turmas</div>
              <p className="text-gray-600 text-sm">Gerencie suas turmas</p>
            </Link>
            <Link href="/dashboard" className="rounded-2xl border p-6 shadow-sm bg-white">
              <div className="text-xl font-bold">Painel</div>
              <p className="text-gray-600 text-sm">Resumo rápido</p>
            </Link>
          </div>
          <div className="mt-10" />
          <BackBar />
        </section>
      )}
    </main>
  );
}
