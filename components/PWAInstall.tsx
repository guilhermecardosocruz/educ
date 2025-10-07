"use client";
import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: () => Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setInstalled(true);
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
    window.addEventListener("appinstalled", onInstalled as EventListener);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall as EventListener);
      window.removeEventListener("appinstalled", onInstalled as EventListener);
    };
  }, []);

  if (installed || !visible || !deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    const choice = await deferred.userChoice?.();
    if (choice?.outcome === "accepted") setVisible(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[min(95%,420px)] rounded-2xl border border-neutral-200 bg-white/90 backdrop-blur shadow-lg p-3 flex items-center gap-3">
      <div className="h-8 w-8 rounded-lg bg-[#0A66FF] text-white grid place-items-center font-bold">e</div>
      <div className="flex-1">
        <p className="text-sm font-medium">Instalar o app</p>
        <p className="text-xs text-neutral-600">Adicione o <b>educ</b> à tela inicial.</p>
      </div>
      <button onClick={handleInstall} className="rounded-xl bg-black text-white text-sm px-3 py-2">Instalar</button>
    </div>
  );
}
