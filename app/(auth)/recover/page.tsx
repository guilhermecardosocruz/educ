"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import A11yNote from "@/components/A11yNote";

export default function RecoverPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(()=>{ emailRef.current?.focus(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!email) { setErr("Informe seu e-mail."); return; }
    setLoading(true);
    try {
      await new Promise(r=>setTimeout(r, 300));
      setMsg("Se o e-mail existir, enviaremos um link de recuperação.");
    } catch {
      setErr("Não foi possível enviar. Tente novamente.");
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout>
      <main className="max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold mb-2">Recuperar acesso</h1>
        <A11yNote className="mb-4">Informe seu e-mail para receber instruções. Mensagens são anunciadas por aria-live.</A11yNote>
        <form onSubmit={onSubmit} noValidate aria-describedby="recover-live">
          <div className="mb-4">
            <label htmlFor="email" className="block font-medium">E-mail</label>
            <input id="email" ref={emailRef} type="email" required
              placeholder="seu@email.com" value={email}
              onChange={e=>setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border p-3" aria-required="true" />
          </div>
          <div id="recover-live" aria-live="polite" className="min-h-[1.5rem] mb-2 text-sm">
            {err && <p className="text-red-700">{err}</p>}
            {msg && <p className="text-green-700">{msg}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="btn-a11y shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70"
            aria-busy={loading ? "true" : "false"}>
            {loading ? "Enviando…" : "Enviar link"}
          </button>
        </form>
        <nav className="mt-4">
          <Link className="underline" href="/login">Voltar ao login</Link>
        </nav>
      </main>
    </AuthLayout>
  );
}
