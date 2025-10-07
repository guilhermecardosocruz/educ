import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hash } from "bcryptjs";
const prisma = new PrismaClient();
const bodySchema = z.object({ token: z.string().min(10), password: z.string().min(6) });
export async function POST(req: Request) {
  try {
    const { token, password } = bodySchema.parse(await req.json());
    const record = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      return NextResponse.json({ ok:false, message:"Token inválido ou expirado" }, { status: 400 });
    }
    const passwordHash = await hash(password, 10);
    await prisma.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } });
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, message: e.message ?? "Erro" }, { status: 400 });
  }
}
export async function GET(req: Request) {
  const url = new URL(req.url); const token = url.searchParams.get("token") || "";
  const target = new URL(`/reset?token=${encodeURIComponent(token)}`, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  return NextResponse.redirect(target);
}
