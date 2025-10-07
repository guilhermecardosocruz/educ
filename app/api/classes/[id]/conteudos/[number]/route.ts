import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { startTimer, recordApi } from "@/lib/metrics";

type Ctx = { params: { id: string; number: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const t = startTimer("api:contents:byNumber");
  let status = 200, ok = true;
  const classId = ctx?.params?.id;
  const numberStr = ctx?.params?.number;
  try {
    const user = await requireUser();
    const number = parseInt(numberStr || "", 10);
    if (!Number.isFinite(number)) return NextResponse.json({ ok: false, error: "Número inválido" }, { status: (status = 400) });

    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id) return NextResponse.json({ ok: false, error: "Not Found" }, { status: (status = 404) });

    const lesson = await prisma.lesson.findUnique({ where: { classId_number: { classId, number } }, select: { id: true } });
    if (!lesson) return NextResponse.json({ ok: false, error: "Lesson não encontrada" }, { status: (status = 404) });

    const content = await prisma.content.findUnique({
      where: { lessonId: lesson.id },
      select: { id: true, title: true, text: true, objetivos: true, desenvolvimento: true, recursos: true, bncc: true, createdAt: true, updatedAt: true }
    });
    if (!content) return NextResponse.json({ ok: false, error: "Conteúdo não encontrado para esta aula" }, { status: (status = 404) });

    return NextResponse.json({ ok: true, content });
  } catch (e) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:contents:byNumber", t.end(), status, ok, { classId, number: numberStr });
  }
}
