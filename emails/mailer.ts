import fs from "node:fs";
import path from "node:path";
import { Resend } from "resend";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    try {
      const dir = ".tmp";
      fs.mkdirSync(dir, { recursive: true });
      const logLine = `${new Date().toISOString()} password-reset to=${to} url=${resetUrl}\n`;
      fs.appendFileSync(path.join(dir, "dev-mails.log"), logLine);
      console.log(`[DEV-MAIL] to=${to} url=${resetUrl}`);
    } catch {}
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Config de e-mail ausente (RESEND_API_KEY/FROM_EMAIL).");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: "Recuperação de senha — educ",
    html: `<p>Redefina sua senha clicando no link abaixo (válido por 60 min):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
}
