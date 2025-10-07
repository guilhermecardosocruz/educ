"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import A11yNote from "@/components/A11yNote";

export default function RegisterPage() {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (!name || !email || !pass) { setErr("Preencha todos os campos."); return; }
    setLoading(true);
    try {
      await new Promise(r=>setTimeout(r, 300));
      setMsg("Conta criada. Faça login.");
    } catch {
      setErr("Falha ao criar conta.");
    } finally { setLoading(false); }
  }

  return (
    <AuthLayout>
      <main className="max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold mb-2">Criar conta</h1>
        <A11yNote className="mb-4">Os campos possuem rótulo, validação e foco visível. As mensagens são anunciadas.</A11yNote>
        <form onSubmit={onSubmit} noValidate aria-describedby="reg-live">
          <div className="mb-4">
            <label htmlFor="name" className="block font-medium">Nome</label>
            <input id="name" ref={nameRef} value={name} onChange={e=>setName(e.target.value)} required
              placeholder="Seu nome" aria-required="true" className="mt-1 w-full rounded-lg border p-3" />
          </div>
          <div className="mb-4">
            <label htmlFor="email" className="block font-medium">E-mail</label>
            <input id="email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required
              placeholder="seu@email.com" aria-required="true" className="mt-1 w-full rounded-lg border p-3" />
          </div>
          <div className="mb-4">
            <label htmlFor="pass" className="block font-medium">Senha</label>
            <input id="pass" type="password" value={pass} onChange={e=>setPass(e.target.value)} required
              placeholder="mínimo 8 caracteres" aria-required="true" className="mt-1 w-full rounded-lg border p-3" />
          </div>
          <div id="reg-live" aria-live="polite" className="min-h-[1.5rem] mb-2 text-sm">
            {err && <p className="text-red-700">{err}</p>}
            {msg && <p className="text-green-700">{msg}</p>}
          </div>
          <button type="submit" disabled={loading}
            className="btn-a11y shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70"
            aria-busy={loading ? "true" : "false"}>
            {loading ? "Criando…" : "Criar conta"}
          </button>
        </form>
        <nav className="mt-4">
          <Link className="underline" href="/login">Já tenho conta</Link>
        </nav>
      </main>
    </AuthLayout>
  );
}
