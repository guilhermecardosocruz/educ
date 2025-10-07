"use client";
import { useEffect, useState } from "react";
export default function LoginPage() {
  const [email,setEmail]=useState(""); const [password,setPassword]=useState(""); const [loading,setLoading]=useState(false); const [msg,setMsg]=useState<string|null>(null);
  useEffect(() => { fetch("/api/auth/me").then(r=>r.ok?r.json():null).then(d=>{ if(d?.ok) location.href="/dashboard"; }); }, []);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setMsg(null);
    const res = await fetch("/api/auth/login",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ email, password }) });
    setLoading(false); if(res.ok) location.href="/dashboard"; else setMsg((await res.json()).message ?? "Falha no login");
  };
  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold">Entrar</h1>
      <form onSubmit={submit} className="mt-4 space-y-3" aria-label="Formulário de login">
        <label className="block"><span className="text-sm">E-mail</span><input className="mt-1 w-full rounded border px-3 py-2" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></label>
        <label className="block"><span className="text-sm">Senha</span><input className="mt-1 w-full rounded border px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        <button disabled={loading} className="w-full rounded bg-black text-white py-2">{loading?"Entrando...":"Entrar"}</button>
      </form>
      {msg && <p className="mt-3 text-red-600 text-sm" role="alert">{msg}</p>}
      <div className="mt-4 flex justify-between text-sm">
        <a className="underline text-blue-600" href="/register">Criar conta</a>
        <a className="underline text-blue-600" href="/recover">Esqueci minha senha</a>
      </div>
    </main>
  );
}
