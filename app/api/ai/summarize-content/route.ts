import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

/**
 * POST /api/ai/summarize-content
 * body: { text: string }
 * Retorna um resumo fictício (stub) do conteúdo.
 */
export async function POST(req: Request) {
  try {
    await requireUser(); // restringe ao usuário autenticado
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.text || "").trim();
    if (!raw) {
      return NextResponse.json({ ok: false, error: "Campo 'text' é obrigatório." }, { status: 400 });
    }

    const summary = fakeSummarize(raw, 420);
    return NextResponse.json({ ok: true, summary, model: "stub-v0" });
  } catch (e) {
    if (e instanceof Response) return e as any;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}

function fakeSummarize(input: string, max = 420): string {
  // Remove markdown básico, normaliza espaços
  const plain = input
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, "$1")
    .replace(/[*_>#-]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Regras bobas para dar cara de “IA”
  const first = plain.slice(0, max).trimEnd();
  const sentences = first.split(/(?<=[\.\!\?])\s+/).slice(0, 3).join(" ");
  const tag = "Resumo (IA • demo): ";
  const out = sentences || first || input.slice(0, Math.min(140, input.length));
  return tag + out + (out.endsWith(".") ? "" : "…");
}
