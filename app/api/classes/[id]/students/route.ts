import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Ctx = { params: { id: string } };

function digits(v: unknown) {
  return String(v ?? "").replace(/\D+/g, "");
}

export async function GET(_req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  if (!classId) return NextResponse.json({ ok: false, error: "ID ausente" }, { status: 400 });

  try {
    const user = await requireUser();

    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id) return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });

    const items = await prisma.student.findMany({
      where: { classId },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, cpf: true, contact: true, createdAt: true, updatedAt: true }
    });

    return NextResponse.json({ ok: true, items });
  } catch (resp) {
    if (resp instanceof NextResponse) return resp;
    console.error(`GET /api/classes/${classId}/students error:`, resp);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  if (!classId) return NextResponse.json({ ok: false, error: "ID ausente" }, { status: 400 });

  try {
    const user = await requireUser();

    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id) return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    const cpf = digits(body?.cpf || "");
    const contact = String(body?.contact || "").trim() || null;

    if (name.length < 2) return NextResponse.json({ ok: false, error: "Nome inválido" }, { status: 400 });
    if (cpf && cpf.length !== 11) return NextResponse.json({ ok: false, error: "CPF deve ter 11 dígitos" }, { status: 400 });

    const created = await prisma.student.create({
      data: { classId, name, cpf: cpf || null, contact }
    });

    return NextResponse.json({ ok: true, student: created }, { status: 201 });
  } catch (resp) {
    if (resp instanceof NextResponse) return resp;
    console.error(`POST /api/classes/${classId}/students error:`, resp);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}
