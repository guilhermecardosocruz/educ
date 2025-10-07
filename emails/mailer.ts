import { Resend } from "resend";
export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Config de e-mail ausente.");
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from, to, subject: "Recuperação de senha — educ",
    html: `<p>Redefina sua senha clicando no link abaixo (válido por 60 min):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
}
