import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Ctx = { params: { id: string; number: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  const number = parseInt(ctx?.params?.number || "", 10);
  if (!Number.isFinite(number)) {
    return NextResponse.json({ ok: false, error: "Número inválido" }, { status: 400 });
  }
  try {
    const user = await requireUser();
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { ownerId: true }
    });
    if (!cls || cls.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { classId_number: { classId, number } },
      select: {
        id: true,
        classId: true,
        number: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        content: { select: { id: true, title: true } }
      }
    });

    if (!lesson) {
      return NextResponse.json({ ok: false, error: "Lesson não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lesson });
  } catch (e) {
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}

// Opcional: permite editar o título da chamada
export async function PATCH(req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  const number = parseInt(ctx?.params?.number || "", 10);
  if (!Number.isFinite(number)) {
    return NextResponse.json({ ok: false, error: "Número inválido" }, { status: 400 });
  }
  try {
    const user = await requireUser();
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { ownerId: true }
    });
    if (!cls || cls.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.trim() : null;

    const updated = await prisma.lesson.update({
      where: { classId_number: { classId, number } },
      data: { title: title && title.length ? title : null },
      select: { id: true, number: true, title: true, updatedAt: true }
    });

    return NextResponse.json({ ok: true, lesson: updated });
  } catch (e: any) {
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}
