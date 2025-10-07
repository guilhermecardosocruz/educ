"use client";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState<string|null>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r=>r.ok?r.json():null).then(d=>{ if(d?.ok) location.href="/dashboard"; });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await fetch("/api/auth/login",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ email, password })
    });
    setLoading(false);
    if(res.ok) location.href="/dashboard";
    else setMsg((await res.json()).message ?? "Falha no login");
  };

  return (
    <main className="min-h-dvh bg-gradient-to-b from-white to-neutral-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="px-6 pt-6">
            <h1 className="text-2xl font-semibold">Bem-vindo</h1>
            <p className="mt-1 text-sm text-neutral-600">Acesse sua conta para continuar.</p>
          </div>

          <form onSubmit={submit} className="px-6 pb-6 pt-4 space-y-4" aria-label="Formulário de login">
            <label className="block">
              <span className="text-sm">E-mail</span>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 outline-none ring-0 focus:border-[#0A66FF]"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e=>setEmail(e.target.value)}
                required
                aria-label="E-mail"
              />
            </label>

            <label className="block">
              <span className="text-sm">Senha</span>
              <input
                className="mt-1 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 outline-none ring-0 focus:border-[#0A66FF]"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e=>setPassword(e.target.value)}
                required
                aria-label="Senha"
              />
            </label>

            <div className="flex items-center justify-between text-sm">
              <a className="text-[#0A66FF] underline" href="/recover">Esqueci minha senha</a>
              <a className="text-neutral-600 underline" href="/register">Criar conta</a>
            </div>

            <button
              disabled={loading}
              className="w-full rounded-xl bg-black text-white py-2.5 font-medium disabled:opacity-70"
              aria-busy={loading}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>

            {msg && <p className="text-red-600 text-sm" role="alert">{msg}</p>}
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-neutral-500">
          Ao continuar, você concorda com nossos termos e política de privacidade.
        </p>
      </div>
    </main>
  );
}
