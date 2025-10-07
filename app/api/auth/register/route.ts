import { NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { createSession } from "@/lib/auth";
const prisma = new PrismaClient();
const schema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), confirm: z.string().min(6) })
  .refine(d => d.password === d.confirm, { path: ["confirm"], message: "Senhas diferentes" });
export async function POST(req: Request) {
  try {
    const { name, email, password } = schema.parse(await req.json());
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return NextResponse.json({ ok:false, message:"E-mail já cadastrado" }, { status: 400 });
    const passwordHash = await hash(password, 10);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });
    await createSession({ sub: user.id, email: user.email, name: user.name });
    return NextResponse.json({ ok:true, user: { id:user.id, name:user.name, email:user.email } });
  } catch (e:any) {
    return NextResponse.json({ ok:false, message: e.message ?? "Erro" }, { status: 400 });
  }
}
