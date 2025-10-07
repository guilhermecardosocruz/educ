"use client";
import { useState, useEffect } from "react";
export default function ResetPage() {
  const [token,setToken]=useState(""); const [password,setPassword]=useState(""); const [confirm,setConfirm]=useState(""); const [msg,setMsg]=useState<string|null>(null); const [loading,setLoading]=useState(false);
  useEffect(()=>{ setToken(new URLSearchParams(location.search).get("token") || ""); },[]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null); if (password!==confirm){ setMsg("Senhas diferentes"); return; }
    setLoading(true);
    const res = await fetch("/api/auth/reset",{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ token, password }) });
    setLoading(false); if(res.ok) setMsg("Senha redefinida. Você já pode entrar."); else setMsg((await res.json()).message ?? "Erro ao redefinir");
  };
  return (
    <main className="max-w-sm mx-auto p-6">
      <h1 className="text-2xl font-semibold">Redefinir senha</h1>
      <form onSubmit={submit} className="mt-4 space-y-3" aria-label="Formulário de redefinição">
        <label className="block"><span className="text-sm">Nova senha</span><input className="mt-1 w-full rounded border px-3 py-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/></label>
        <label className="block"><span className="text-sm">Confirmar senha</span><input className="mt-1 w-full rounded border px-3 py-2" type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required/></label>
        <button disabled={loading} className="w-full rounded bg-black text-white py-2">{loading?"Salvando...":"Salvar nova senha"}</button>
      </form>
      {msg && <p className="mt-3 text-sm" role="status">{msg}</p>}
    </main>
  );
}
