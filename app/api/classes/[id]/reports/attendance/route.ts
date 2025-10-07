import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

/**
 * Relatório de frequência por período.
 * Observação: O schema atual não possui registros individuais de presença/ausência.
 * Assim, retornamos agregados de alunos e aulas no período e um indicador de que os
 * dados de presença detalhados não estão disponíveis ainda.
 *
 * Query params:
 *   start=YYYY-MM-DD
 *   end=YYYY-MM-DD   (inclusive até 23:59:59.999)
 */
type Ctx = { params: { id: string } };

function parseDateOnly(d?: string | null): Date | null {
  if (!d) return null;
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(d);
  if (!m) return null;
  const dt = new Date(d + "T00:00:00.000Z");
  return isNaN(dt.getTime()) ? null : dt;
}

export async function GET(req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const startStr = url.searchParams.get("start");
    const endStr = url.searchParams.get("end");

    const start = parseDateOnly(startStr);
    const endBase = parseDateOnly(endStr);

    // Faixa padrão: últimos 30 dias
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);
    const rangeStart = start ?? defaultStart;

    const rangeEnd = endBase
      ? new Date(endBase.getTime() + 24 * 60 * 60 * 1000 - 1) // final do dia
      : now;

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, ownerId: true, name: true }
    });
    if (!cls || cls.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }

    const [students, lessons] = await prisma.$transaction([
      prisma.student.findMany({
        where: { classId },
        select: { id: true, name: true }
      }),
      prisma.lesson.findMany({
        where: {
          classId,
          createdAt: { gte: rangeStart, lte: rangeEnd }
        },
        select: { id: true, number: true, createdAt: true, title: true },
        orderBy: { number: "asc" }
      })
    ]);

    // Como não há presenças registradas no schema, retornamos placeholders.
    // Quando a camada de presença for criada (ex.: tabela Attendance), este bloco
    // pode ser substituído por agregações reais.
    const perStudent = students.map(s => ({
      studentId: s.id,
      studentName: s.name,
      presents: null as number | null,
      absences: null as number | null,
      attendancePct: null as number | null
    }));

    return NextResponse.json({
      ok: true,
      meta: {
        classId,
        className: cls.name,
        range: {
          start: rangeStart.toISOString(),
          end: rangeEnd.toISOString()
        },
        lessonsCount: lessons.length,
        studentsCount: students.length,
        attendanceDataAvailable: false
      },
      lessons,
      perStudent
    });
  } catch (e) {
    if (e instanceof NextResponse) return e;
    console.error("GET /reports/attendance error", e);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}
