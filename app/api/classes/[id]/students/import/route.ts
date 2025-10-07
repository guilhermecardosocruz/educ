import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Ctx = { params: { id: string } };

function digits(v: unknown) {
  return String(v ?? "").replace(/\D+/g, "");
}

export async function POST(req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  if (!classId) return NextResponse.json({ ok: false, error: "ID ausente" }, { status: 400 });

  try {
    const user = await requireUser();

    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) {
      return NextResponse.json({ ok: false, error: "Nada para importar" }, { status: 400 });
    }

    // Sanitiza
    const cleaned = rows
      .map((r: any) => ({
        name: String(r?.name ?? "").trim(),
        cpf: digits(r?.cpf),
        contact: String(r?.contact ?? "").trim()
      }))
      .filter((r: any) => r.name.length >= 2)
      .slice(0, 1000); // limite básico de segurança

    if (!cleaned.length) {
      return NextResponse.json({ ok: false, error: "Linhas inválidas (campo name obrigatório)" }, { status: 400 });
    }

    // Inserção em lote
    const createData = cleaned.map((r: any) => ({
      classId,
      name: r.name,
      cpf: r.cpf || null,
      contact: r.contact || null
    }));

    const res = await prisma.student.createMany({
      data: createData,
      skipDuplicates: false // sem unique, insere todos válidos
    });

    const inserted = res.count || 0;
    const skipped = cleaned.length - inserted;

    return NextResponse.json({ ok: true, inserted, skipped });
  } catch (resp) {
    if (resp instanceof NextResponse) return resp;
    console.error(`POST /api/classes/${classId}/students/import error:`, resp);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}
