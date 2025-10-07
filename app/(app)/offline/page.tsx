export const dynamic = "force-static";
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Você está offline</h1>
      <p className="mt-2 text-neutral-600">Esta é a página de fallback quando não há conexão.</p>
      <a className="mt-4 inline-block underline text-blue-600" href="/">Voltar ao início</a>
    </main>
  );
}
