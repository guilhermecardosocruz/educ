import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { JWTPayload } from "jose";
import { prisma } from "@/lib/prisma";
import { authCookieName, verifyToken } from "@/lib/auth";

/**
 * Lê o cookie de sessão e tenta resolver o usuário atual.
 * - Retorna o objeto User do Prisma ou null se não autenticado/inválido.
 * - Não lança; ideal para rotas públicas que exibem conteúdo diferente quando logado.
 */
export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(authCookieName())?.value;
  if (!token) return null;

  let payload: JWTPayload & { sub?: string } | null = null;
  try {
    payload = await verifyToken(token);
  } catch {
    return null; // token inválido/expirado
  }
  const userId = payload?.sub;
  if (!userId) return null;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user ?? null;
}

/**
 * Exige usuário autenticado.
 * - Retorna o User se ok.
 * - Caso contrário, lança um NextResponse com 401 (sem token/invalid) ou 403 (usuário inexistente/bloqueado).
 *
 * Uso em rotas:
 *   export async function GET() {
 *     try {
 *       const user = await requireUser();
 *       return NextResponse.json({ ok: true, user });
 *     } catch (resp) {
 *       // Se for um NextResponse (erro auth), apenas retorne
 *       if (resp instanceof NextResponse) return resp;
 *       throw resp; // outros erros
 *     }
 *   }
 */
export async function requireUser() {
  const store = await cookies();
  const token = store.get(authCookieName())?.value;

  if (!token) {
    throw NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let payload: JWTPayload & { sub?: string } | null = null;
  try {
    payload = await verifyToken(token);
  } catch {
    throw NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const userId = payload?.sub;
  if (!userId) {
    throw NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    // Token válido mas usuário não encontrado (excluído/desativado)
    throw NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  return user;
}
