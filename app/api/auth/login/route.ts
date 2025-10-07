import { NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
import { createSession } from "@/lib/auth";
const prisma = new PrismaClient();
const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
export async function POST(req: Request) {
  try {
    const { email, password } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ ok:false, message:"Credenciais inválidas" }, { status: 401 });
    const ok = await compare(password, user.passwordHash);
    if (!ok) return NextResponse.json({ ok:false, message:"Credenciais inválidas" }, { status: 401 });
    await createSession({ sub: user.id, email: user.email, name: user.name });
    return NextResponse.json({ ok:true });
  } catch (e:any) {
    return NextResponse.json({ ok:false, message: e.message ?? "Erro" }, { status: 400 });
  }
}
