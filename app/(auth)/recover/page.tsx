"use client";
import { useState } from "react";
export default function RecoverPage() {
  const [email,setEmail]=useState(""); const [loading,setLoading]=useState(false); const [msg,setMsg]=useState<string|null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMsg(null);
    await fetch("/api/auth/recover",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email }) }).catch(()=>{});
    setLoading(false); setMsg("Se você tem conta cadastrada, receberá um e-mail com instruções.");
  };
  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold">Recuperar senha</h1>
      <form onSubmit={submit} className="mt-4 space-y-3" aria-label="Formulário de recuperação">
        <label className="block"><span className="text-sm">E-mail</span><input className="mt-1 w-full rounded border px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
        <button disabled={loading} className="w-full rounded bg-black text-white py-2">{loading?"Enviando...":"Enviar link"}</button>
      </form>
      {msg && <p className="mt-3 text-neutral-700 text-sm" role="status">{msg}</p>}
      <div className="mt-4 text-sm"><a className="underline text-blue-600" href="/login">Voltar ao login</a></div>
    </main>
  );
}
