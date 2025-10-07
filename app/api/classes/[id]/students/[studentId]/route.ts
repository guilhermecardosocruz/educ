import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Ctx = { params: { id: string; studentId: string } };

function digits(v: unknown) {
  return String(v ?? "").replace(/\D+/g, "");
}

export async function PATCH(req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  const studentId = ctx?.params?.studentId;
  if (!classId || !studentId) return NextResponse.json({ ok: false, error: "Parâmetros ausentes" }, { status: 400 });

  try {
    const user = await requireUser();

    // garante ownership via join
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classId: true, class: { select: { ownerId: true } } }
    });

    if (!student || student.classId !== classId || student.class.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (typeof body?.name === "string") {
      const name = body.name.trim();
      if (name.length < 2) return NextResponse.json({ ok: false, error: "Nome inválido" }, { status: 400 });
      data.name = name;
    }
    if (body?.cpf !== undefined) {
      const cpf = digits(body.cpf);
      if (cpf && cpf.length !== 11) return NextResponse.json({ ok: false, error: "CPF deve ter 11 dígitos" }, { status: 400 });
      data.cpf = cpf || null;
    }
    if (body?.contact !== undefined) {
      const contact = String(body.contact || "").trim();
      data.contact = contact || null;
    }

    const updated = await prisma.student.update({
      where: { id: studentId },
      data,
      select: { id: true, name: true, cpf: true, contact: true, createdAt: true, updatedAt: true }
    });

    return NextResponse.json({ ok: true, student: updated });
  } catch (resp) {
    if (resp instanceof NextResponse) return resp;
    console.error(`PATCH /api/classes/${classId}/students/${studentId} error:`, resp);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  const studentId = ctx?.params?.studentId;
  if (!classId || !studentId) return NextResponse.json({ ok: false, error: "Parâmetros ausentes" }, { status: 400 });

  try {
    const user = await requireUser();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, classId: true, class: { select: { ownerId: true } } }
    });

    if (!student || student.classId !== classId || student.class.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }

    await prisma.student.delete({ where: { id: studentId } });
    return new NextResponse(null, { status: 204 });
  } catch (resp) {
    if (resp instanceof NextResponse) return resp;
    console.error(`DELETE /api/classes/${classId}/students/${studentId} error:`, resp);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}
