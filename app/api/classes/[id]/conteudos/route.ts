import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { startTimer, recordApi } from "@/lib/metrics";
import { reserveNextNumber } from "@/lib/sequencer";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const t = startTimer("api:contents:get");
  let status = 200, ok = true;
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id) return NextResponse.json({ ok: false, error: "Not Found" }, { status: (status = 404) });

    const items = await prisma.content.findMany({
      where: { classId },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true, lesson: { select: { number: true } } }
    });

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:contents:get", t.end(), status, ok, { classId });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const t = startTimer("api:contents:post");
  let status = 201, ok = true;
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id)
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: (status = 404) });

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim();
    const text = String(body?.text || "").trim();
    const objetivos = body?.objetivos ? String(body.objetivos) : null;
    const desenvolvimento = body?.desenvolvimento ? String(body.desenvolvimento) : null;
    const recursos = body?.recursos ? String(body.recursos) : null;
    const bncc = body?.bncc ? String(body.bncc) : null;

    // Integração com sequência:
    // - number: número desejado (pode ter sido lido antes e ficar defasado)
    // - expectedNumber: número esperado pelo cliente (para informar renumeração)
    // - autonumber: se true ou se number não foi enviado, reserva automaticamente
    const clientNumber = Number.isFinite(body?.number) ? Number(body.number) : null;
    const clientExpected = Number.isFinite(body?.expectedNumber) ? Number(body.expectedNumber) : clientNumber;
    const autonumber = body?.autonumber === true || clientNumber == null;

    let usedNumber: number | null = null;
    if (autonumber) {
      // Reserva novo número no contador
      const res = await reserveNextNumber(prisma, classId);
      usedNumber = res.used;
    } else {
      // Se o cliente enviou um número, usa-o se existir Lesson; se estiver defasado, tenta reservar um novo e avisa
      const exists = await prisma.lesson.findUnique({
        where: { classId_number: { classId, number: clientNumber! } },
        select: { id: true }
      });
      if (!exists) {
        // Número não existe como Lesson — tenta criar conteúdo desacoplado ou renumerar?
        // Mantemos comportamento: cria conteúdo sem lessonId, porém se allowRenumber estiver true, usa número reservado.
        if (body?.allowRenumber) {
          const res = await reserveNextNumber(prisma, classId);
          usedNumber = res.used;
        }
      } else {
        usedNumber = clientNumber!;
      }
    }

    // Encontra (ou não) a Lesson associada ao usedNumber
    let lessonId: string | null = null;
    if (usedNumber != null) {
      const lesson = await prisma.lesson.findUnique({
        where: { classId_number: { classId, number: usedNumber } },
        select: { id: true }
      });
      lessonId = lesson?.id ?? null;
    } else if (clientNumber != null) {
      // fallback ao número do cliente (pode não ter lesson)
      const lesson = await prisma.lesson.findUnique({
        where: { classId_number: { classId, number: clientNumber } },
        select: { id: true }
      });
      lessonId = lesson?.id ?? null;
    }

    if (!title || !text) return NextResponse.json({ ok: false, error: "title e text são obrigatórios" }, { status: (status = 400) });

    const created = await prisma.content.create({
      data: { classId, lessonId, title, text, objetivos, desenvolvimento, recursos, bncc },
      select: { id: true, title: true, createdAt: true, lesson: { select: { number: true } } }
    });

    const renumbered = clientExpected != null && usedNumber != null && clientExpected !== usedNumber;
    const message = renumbered
      ? `O número do conteúdo foi atualizado de #${clientExpected} para #${usedNumber} devido a alterações simultâneas.`
      : undefined;

    return NextResponse.json({ ok: true, content: created, usedNumber, renumbered, message }, { status: 201 });
  } catch (e) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:contents:post", t.end(), status, ok, { classId });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const t = startTimer("api:contents:deleteAll");
  let status = 204, ok = true;
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id) return NextResponse.json({ ok: false, error: "Not Found" }, { status: (status = 404) });

    await prisma.content.deleteMany({ where: { classId } });
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:contents:deleteAll", t.end(), status, ok, { classId });
  }
}
