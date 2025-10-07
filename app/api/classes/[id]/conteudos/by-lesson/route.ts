import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";

/**
 * Redireciona internamente para /api/classes/[id]/conteudos/[number]
 */
type Ctx = { params: { id: string } };

export async function GET(req: Request, ctx: Ctx) {
  // exige auth para manter semântica de proteção, embora o conteúdo final também verifique
  await requireUser();

  const url = new URL(req.url);
  const n = url.searchParams.get("number");
  if (!n) return NextResponse.json({ ok: false, error: "Parâmetro 'number' ausente" }, { status: 400 });

  // Proxy: reconstroi URL para o endpoint canônico
  const target = new URL(req.url);
  const base = target.origin;
  const id = ctx.params.id;
  const proxied = `${base}/api/classes/${encodeURIComponent(id)}/conteudos/${encodeURIComponent(n)}`;

  const proxRes = await fetch(proxied, { method: "GET", headers: { "Content-Type": "application/json" }, cache: "no-store" });
  const body = await proxRes.text();
  return new NextResponse(body, { status: proxRes.status, headers: { "Content-Type": "application/json" } });
}
