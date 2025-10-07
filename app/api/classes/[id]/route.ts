import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { startTimer, recordApi } from "@/lib/metrics";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const t = startTimer("api:class:get");
  let status = 200, ok = true;
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();
    const cls = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, description: true, nextNo: true, ownerId: true, createdAt: true, updatedAt: true }
    });
    if (!cls || cls.ownerId !== user.id) return NextResponse.json({ ok: false, error: "Not Found" }, { status: (status = 404) });
    const counts = await prisma.$transaction([
      prisma.student.count({ where: { classId } }),
      prisma.lesson.count({ where: { classId } }),
      prisma.content.count({ where: { classId } })
    ]);
    const lastLesson = await prisma.lesson.findFirst({ where: { classId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    return NextResponse.json({
      ok: true,
      class: { id: cls.id, name: cls.name, description: cls.description, nextNo: cls.nextNo, createdAt: cls.createdAt, updatedAt: cls.updatedAt },
      counts: { students: counts[0], lessons: counts[1], contents: counts[2] },
      lastLessonAt: lastLesson?.createdAt ?? null
    });
  } catch (e) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:class:get", t.end(), status, ok, { classId });
  }
}
