import { NextResponse } from "next/server";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/emails/mailer";
const prisma = new PrismaClient();
const schema = z.object({ email: z.string().email() });
export async function POST(req: Request) {
  const neutral = NextResponse.json({ ok:true, message:"Se existir conta, enviaremos um e-mail com instruções." });
  try {
    const { email } = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return neutral;
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60*60*1000);
    await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${base}/api/auth/reset?token=${token}`;
    await sendPasswordResetEmail(email, resetUrl).catch(()=>{});
    return neutral;
  } catch { return neutral; }
}
