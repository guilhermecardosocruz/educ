import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { NextResponse } from "next/server";

type Ctx = { params: { id: string } };

/**
 * GET /api/classes/:id/export?pretty=1
 * Exporta um snapshot JSON completo da turma para backup do usuário:
 * - Metadados da turma
 * - Alunos
 * - Chamadas (lessons)
 * - Conteúdos
 * Retorna como attachment application/json.
 */
export async function GET(req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();

    // Verifica ownership e coleta metadados básicos
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        name: true,
        description: true,
        nextNo: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!cls || cls.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }

    // Carrega dados relacionados em paralelo
    const [students, lessons, contents] = await Promise.all([
      prisma.student.findMany({
        where: { classId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          cpf: true,
          contact: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.lesson.findMany({
        where: { classId },
        orderBy: { number: "asc" },
        select: {
          id: true,
          number: true,
          title: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.content.findMany({
        where: { classId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          text: true,
          objetivos: true,
          desenvolvimento: true,
          recursos: true,
          bncc: true,
          createdAt: true,
          updatedAt: true,
          lesson: { select: { number: true } }
        }
      })
    ]);

    // Monta payload de export
    const payload = {
      ok: true,
      exportedAt: new Date().toISOString(),
      version: "educ-export.v1",
      class: {
        id: cls.id,
        name: cls.name,
        description: cls.description,
        nextNo: cls.nextNo,
        createdAt: cls.createdAt,
        updatedAt: cls.updatedAt
      },
      students,
      lessons,
      contents: contents.map(c => ({
        id: c.id,
        title: c.title,
        text: c.text,
        objetivos: c.objetivos,
        desenvolvimento: c.desenvolvimento,
        recursos: c.recursos,
        bncc: c.bncc,
        lessonNumber: c.lesson?.number ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }))
    };

    const url = new URL(req.url);
    const pretty = url.searchParams.get("pretty") === "1";
    const body = pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
    const filename = `educ-class-${cls.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || cls.id}-${cls.id}.json`;

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (e) {
    if (e instanceof NextResponse) return e;
    console.error("EXPORT ERROR", e);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}
