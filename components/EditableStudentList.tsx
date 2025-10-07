"use client";

import { useEffect, useMemo, useState } from "react";

type Student = {
  id: string;
  name: string;
  cpf?: string | null;
  contact?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  classId: string;
};

function fmtCpf(cpf?: string | null) {
  if (!cpf) return "";
  const d = cpf.replace(/\D+/g, "");
  return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
}

export default function EditableStudentList({ classId }: Props) {
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<{ name: string; cpf: string; contact: string }>({ name: "", cpf: "", contact: "" });

  const count = useMemo(() => items.length, [items]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/classes/${classId}/students`, { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) {
        setItems(json.items as Student[]);
      } else {
        setErr(json?.error || "Falha ao carregar alunos.");
      }
    } catch {
      setErr("Erro de rede ao carregar alunos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  function startEdit(s: Student) {
    setEditing(s.id);
    setForm({ name: s.name, cpf: s.cpf || "", contact: s.contact || "" });
  }

  function cancelEdit() {
    setEditing(null);
    setForm({ name: "", cpf: "", contact: "" });
  }

  async function saveEdit(id: string) {
    const payload = { name: form.name.trim(), cpf: form.cpf.replace(/\D+/g, "") || null, contact: form.contact.trim() || null };
    try {
      const res = await fetch(`/api/classes/${classId}/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || "Erro ao salvar");
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...json.student } : it)));
      cancelEdit();
    } catch (e: any) {
      alert(e?.message || "Falha ao salvar aluno.");
    }
  }

  async function remove(id: string) {
    if (!confirm("Remover este aluno?")) return;
    try {
      const res = await fetch(`/api/classes/${classId}/students/${id}`, { method: "DELETE" });
      if (res.status !== 204) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Falha ao remover");
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
    } catch (e: any) {
      alert(e?.message || "Erro ao remover aluno.");
    }
  }

  function moreInfo(s: Student) {
    alert(`Aluno\n\nNome: ${s.name}\nCPF: ${fmtCpf(s.cpf)}\nContato: ${s.contact || "-"}`);
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-600">{loading ? "Carregando…" : `${count} aluno(s)`}</div>
      {err && <p className="text-red-600">{err}</p>}
      {!err && (
        <ul className="grid gap-2">
          {items.map((s) => (
            <li
              key={s.id}
              onDoubleClick={() => startEdit(s)}
              className="rounded-xl border p-3 bg-white shadow-sm flex items-center justify-between"
              title="Duplo clique para editar"
            >
              {editing === s.id ? (
                <div className="flex-1 flex flex-col gap-2">
                  <input
                    className="rounded-md border p-2"
                    placeholder="Nome"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      className="rounded-md border p-2"
                      placeholder="CPF (apenas números)"
                      inputMode="numeric"
                      value={form.cpf}
                      onChange={(e) => setForm((f) => ({ ...f, cpf: e.target.value }))}
                    />
                    <input
                      className="rounded-md border p-2"
                      placeholder="Contato"
                      value={form.contact}
                      onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1">
                  <div className="font-semibold">{s.name}</div>
                  <div className="text-xs text-gray-500">
                    {fmtCpf(s.cpf)} {s.contact ? `• ${s.contact}` : ""}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                {editing === s.id ? (
                  <>
                    <button onClick={() => saveEdit(s.id)} className="rounded-md border px-3 py-1 text-sm bg-white">Salvar</button>
                    <button onClick={cancelEdit} className="rounded-md border px-3 py-1 text-sm bg-white">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => moreInfo(s)} className="rounded-md border px-3 py-1 text-sm bg-white">Mais info</button>
                    <button onClick={() => startEdit(s)} className="rounded-md border px-3 py-1 text-sm bg-white">Editar</button>
                    <button onClick={() => remove(s.id)} className="rounded-md border px-3 py-1 text-sm bg-white">Excluir</button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
