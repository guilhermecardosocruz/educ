"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import A11yNote from "@/components/A11yNote";

export default function LoginPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!email || !pass) {
      setErr("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      // placeholder auth
      await new Promise((r) => setTimeout(r, 300));
      setMsg("Autenticado. Redirecionando…");
      location.href = "/dashboard";
    } catch (e: any) {
      setErr("Falha no login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <main className="max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold mb-2">Entrar</h1>
        <A11yNote className="mb-4">
          Use suas credenciais cadastradas. Campos obrigatórios possuem rótulos claros. Mensagens são anunciadas para leitores de tela.
        </A11yNote>

        <form onSubmit={onSubmit} noValidate aria-describedby="login-live">
          <div className="mb-4">
            <label htmlFor="email" className="block font-medium">E-mail</label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              aria-required="true"
              aria-invalid={!!err && !email}
              className="mt-1 w-full rounded-lg border p-3"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="pass" className="block font-medium">Senha</label>
            <input
              id="pass"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={pass}
              onChange={(e)=>setPass(e.target.value)}
              aria-required="true"
              aria-invalid={!!err && !pass}
              className="mt-1 w-full rounded-lg border p-3"
            />
          </div>

          <div id="login-live" aria-live="polite" className="min-h-[1.5rem] mb-2 text-sm">
            {err && <p className="text-red-700">{err}</p>}
            {msg && <p className="text-green-700">{msg}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-a11y shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70"
            aria-busy={loading ? "true" : "false"}
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <nav className="mt-4 space-y-1">
          <Link className="underline" href="/register">Criar uma conta</Link><br />
          <Link className="underline" href="/recover">Esqueci minha senha</Link>
        </nav>
      </main>
    </AuthLayout>
  );
}
