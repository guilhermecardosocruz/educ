import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { startTimer, recordApi } from "@/lib/metrics";
import { reserveNextNumber } from "@/lib/sequencer";

type Ctx = { params: { id: string } };

export async function GET(req: Request, ctx: Ctx) {
  const t = startTimer("api:lessons:get");
  let status = 200, ok = true;
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.max(1, Math.min(50, parseInt(url.searchParams.get("pageSize") || "10", 10)));
    const order = (url.searchParams.get("order") || "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id) return NextResponse.json({ ok: false, error: "Not Found" }, { status: (status = 404) });

    const [total, items] = await prisma.$transaction([
      prisma.lesson.count({ where: { classId } }),
      prisma.lesson.findMany({
        where: { classId },
        orderBy: { number: order as any },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, number: true, title: true, createdAt: true }
      })
    ]);

    return NextResponse.json({ ok: true, total, items, page, pageSize, order });
  } catch (e) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:lessons:get", t.end(), status, ok, { classId });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const t = startTimer("api:lessons:post");
  let status = 201, ok = true;
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id) return NextResponse.json({ ok: false, error: "Not Found" }, { status: (status = 404) });
    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim() || null;
    const clientExpected = Number.isFinite(body?.expectedNumber) ? Number(body.expectedNumber) : null;

    // Reserva atômica do número (evita condição de corrida)
    const { used: numberUsed } = await reserveNextNumber(prisma, classId);

    // Cria a Lesson com o número reservado
    const created = await prisma.lesson.create({
      data: { classId, number: numberUsed, title }
    });

    // Informa renumeração ao cliente, caso ele tenha lido um número antigo
    const renumbered = clientExpected != null && clientExpected !== numberUsed;
    const message = renumbered
      ? `O número da chamada foi atualizado de #${clientExpected} para #${numberUsed} devido a novas criações simultâneas.`
      : undefined;

    return NextResponse.json({ ok: true, lesson: created, usedNumber: numberUsed, renumbered, message }, { status: 201 });
  } catch (e: any) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    // Se houve conflito inesperado de unique (ex.: classId_number), tenta novamente uma vez
    const code = e?.code || e?.meta?.code || "";
    if (code === "P2002" || /unique/i.test(String(e?.message || ""))) {
      try {
        const { used: numberUsed } = await reserveNextNumber(prisma, ctx.params.id);
        const created = await prisma.lesson.create({
          data: { classId: ctx.params.id, number: numberUsed, title: null }
        });
        return NextResponse.json({ ok: true, lesson: created, usedNumber: numberUsed, renumbered: true, message: `Conflito resolvido automaticamente. Nova chamada criada como #${numberUsed}.` }, { status: 201 });
      } catch {
        // cai no retorno padrão de erro
      }
    }
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:lessons:post", t.end(), status, ok, { classId });
  }
}
