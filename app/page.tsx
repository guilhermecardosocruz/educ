export default function Page() {
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-semibold">educ</h1>
      <p className="mt-3 text-neutral-600">
        Base pronta com PWA, autenticação e persistência no banco. Acesse as rotas abaixo.
      </p>
      <div className="mt-6 grid gap-3">
        <a className="underline text-blue-600" href="/login">Entrar</a>
        <a className="underline text-blue-600" href="/register">Criar conta</a>
        <a className="underline text-blue-600" href="/recover">Esqueci minha senha</a>
        <a className="underline text-blue-600" href="/offline">/offline</a>
        <a className="underline text-blue-600" href="/debug/backup">/debug/backup</a>
        <a className="underline text-blue-600" href="/dashboard">/dashboard</a>
      </div>
    </main>
  );
}
