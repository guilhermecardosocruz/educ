"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; cpf?: string; contact?: string }) => Promise<void> | void;
};

function onlyDigits(v: string) {
  return v.replace(/\D+/g, "");
}

export default function AddStudentModal({ open, onClose, onSave }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [contact, setContact] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => nameRef.current?.focus(), 50);
      setErr(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSave() {
    setErr(null);
    const n = name.trim();
    if (n.length < 2) {
      setErr("Informe um nome válido.");
      nameRef.current?.focus();
      return;
    }
    const cpfDigits = onlyDigits(cpf);
    if (cpfDigits && cpfDigits.length !== 11) {
      setErr("CPF deve ter 11 dígitos (apenas números).");
      return;
    }

    setSaving(true);
    try {
      await onSave({ name: n, cpf: cpfDigits || undefined, contact: contact.trim() || undefined });
      // limpa ao salvar
      setName("");
      setCpf("");
      setContact("");
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Falha ao salvar aluno.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-6" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-lg font-semibold">Adicionar aluno</h2>
          <button className="rounded-md border px-3 py-1 text-sm" onClick={onClose} aria-label="Fechar">Fechar</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium">Nome</label>
            <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border p-2" placeholder="Nome completo" />
          </div>
          <div>
            <label className="block text-sm font-medium">CPF (opcional)</label>
            <input value={cpf} onChange={(e) => setCpf(e.target.value)} className="mt-1 w-full rounded-md border p-2" placeholder="Somente números" inputMode="numeric" />
          </div>
          <div>
            <label className="block text-sm font-medium">Contato (opcional)</label>
            <input value={contact} onChange={(e) => setContact(e.target.value)} className="mt-1 w-full rounded-md border p-2" placeholder="Telefone, e-mail etc." />
          </div>

          <div aria-live="polite" className="min-h-[1.5rem] text-sm">
            {err && <p className="text-red-600">{err}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="rounded-xl px-4 py-2 border shadow-sm bg-white">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="rounded-xl px-4 py-2 font-medium shadow bg-[var(--color-secondary,#0A66FF)] text-white disabled:opacity-70">
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
