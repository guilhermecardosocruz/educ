import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Ctx = { params: { id: string } };

function parseDateOnly(d?: string | null): Date | null {
  if (!d) return null;
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(d);
  if (!m) return null;
  const dt = new Date(d + "T00:00:00.000Z");
  return isNaN(dt.getTime()) ? null : dt;
}

/**
 * GET /api/classes/:id/reports/contents?start=YYYY-MM-DD&end=YYYY-MM-DD
 * Retorna conteúdos criados no período com título, objetivos e resumo do texto.
 */
export async function GET(req: Request, ctx: Ctx) {
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const startStr = url.searchParams.get("start");
    const endStr = url.searchParams.get("end");

    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 30);

    const start = parseDateOnly(startStr) ?? defaultStart;
    const endDay = parseDateOnly(endStr) ?? now;
    const end = new Date(endDay.getTime() + 24 * 60 * 60 * 1000 - 1); // final do dia

    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, ownerId: true, name: true }
    });
    if (!cls || cls.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }

    const items = await prisma.content.findMany({
      where: { classId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        objetivos: true,
        text: true,
        createdAt: true,
        lesson: { select: { number: true } }
      }
    });

    const summarized = items.map((c) => ({
      id: c.id,
      title: c.title,
      objetivos: c.objetivos,
      summary: summarize(c.text, 280),
      createdAt: c.createdAt,
      lessonNumber: c.lesson?.number ?? null
    }));

    return NextResponse.json({
      ok: true,
      meta: {
        classId,
        className: cls.name,
        range: { start: start.toISOString(), end: end.toISOString() },
        total: summarized.length
      },
      items: summarized
    });
  } catch (e) {
    if (e instanceof NextResponse) return e;
    console.error("GET /reports/contents error", e);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}

function summarize(md: string | null, max = 280): string | null {
  if (!md) return null;
  // remove markdown básico e links
  const plain = md
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[[^\]]+\]\(([^)]+)\)/g, "$1")
    .replace(/[*_>#-]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max).trimEnd() + "…";
}
