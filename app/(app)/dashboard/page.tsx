import { PrismaClient } from "@prisma/client";
import { getSession } from "@/lib/auth";
const prisma = new PrismaClient();
export default async function DashboardPage() {
  const s = await getSession();
  const user = s ? await prisma.user.findUnique({ where: { id: s.sub }, select: { id:true, name:true, email:true } }) : null;
  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {user ? (
        <div className="mt-3">
          <p className="text-neutral-700">Olá, <b>{user.name}</b> ({user.email})</p>
          <form action="/api/auth/logout" method="POST"><button className="mt-4 rounded bg-black text-white px-4 py-2">Sair</button></form>
        </div>
      ) : (<p className="mt-3">Você não está logado. <a className="underline text-blue-600" href="/login">Entrar</a></p>)}
    </main>
  );
}
