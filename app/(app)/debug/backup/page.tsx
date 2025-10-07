"use client";
export default function BackupPage() {
  const exportar = () => {
    const dump = { ...localStorage };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `educ-backup-${location.host}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importar = async (file?: File) => {
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, String(v)));
      alert("Import concluído. Recarregue a página para aplicar.");
    } catch { alert("Arquivo inválido."); }
  };
  return (
    <main className="mx-auto max-w-xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Backup / Restore (Local)</h1>
      <button onClick={exportar} className="px-4 py-2 rounded bg-black text-white">Exportar JSON</button>
      <div>
        <label className="block mb-2">Importar JSON</label>
        <input type="file" accept="application/json" onChange={(e) => importar(e.target.files?.[0] ?? undefined)} />
      </div>
      <p className="text-sm text-neutral-600">Não limpamos armazenamento automaticamente. Prefira migração/backup.</p>
    </main>
  );
}
