"use client";
import { useState } from "react";
export default function RegisterPage() {
  const [name,setName]=useState(""); const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [loading,setLoading]=useState(false); const [msg,setMsg]=useState<string|null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMsg(null);
    const res = await fetch("/api/auth/register",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ name, email, password, confirm }) });
    setLoading(false); const data = await res.json(); if(res.ok){ location.href="/dashboard"; } else setMsg(data.message ?? "Erro ao criar conta");
  };
  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold">Criar conta</h1>
      <form onSubmit={submit} className="mt-4 space-y-3" aria-label="Formulário de cadastro">
        <label className="block"><span className="text-sm">Nome completo</span><input className="mt-1 w-full rounded border px-3 py-2" value={name} onChange={e=>setName(e.target.value)} required/></label>
        <label className="block"><span className="text-sm">E-mail</span><input className="mt-1 w-full rounded border px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
        <label className="block"><span className="text-sm">Senha</span><input className="mt-1 w-full rounded border px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        <label className="block"><span className="text-sm">Confirmar senha</span><input className="mt-1 w-full rounded border px-3 py-2" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>
        <button disabled={loading} className="w-full rounded bg-black text-white py-2">{loading?"Criando...":"Criar conta"}</button>
      </form>
      {msg && <p className="mt-3 text-red-600 text-sm" role="alert">{msg}</p>}
      <div className="mt-4 text-sm"><a className="underline text-blue-600" href="/login">Já tenho conta</a></div>
    </main>
  );
}
