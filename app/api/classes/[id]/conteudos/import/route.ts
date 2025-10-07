import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { startTimer, recordApi } from "@/lib/metrics";

type Ctx = { params: { id: string } };

export async function POST(req: Request, ctx: Ctx) {
  const t = startTimer("api:contents:import");
  let status = 200, ok = true;
  const classId = ctx?.params?.id;
  try {
    const user = await requireUser();
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { ownerId: true } });
    if (!cls || cls.ownerId !== user.id) return NextResponse.json({ ok: false, error: "Not Found" }, { status: (status = 404) });

    const body = await req.json().catch(() => ({}));
    const rows: any[] = Array.isArray(body?.rows) ? body.rows : [];
    if (!rows.length) return NextResponse.json({ ok: false, error: "Nada para importar" }, { status: (status = 400) });

    let inserted = 0;
    let skipped = 0;

    for (const r of rows.slice(0, 1000)) {
      try {
        const n = parseInt(String(r?.number ?? ""), 10);
        const title = String(r?.title ?? "").trim();
        const text = String(r?.text ?? "").trim();
        if (!Number.isFinite(n) || !title || !text) { skipped++; continue; }
        const lesson = await prisma.lesson.findUnique({ where: { classId_number: { classId, number: n } }, select: { id: true } });
        await prisma.content.create({ data: {
          classId, lessonId: lesson?.id ?? null, title, text,
          objetivos: r?.objetivos ? String(r.objetivos) : null,
          desenvolvimento: r?.desenvolvimento ? String(r.desenvolvimento) : null,
          recursos: r?.recursos ? String(r.recursos) : null,
          bncc: r?.bncc ? String(r.bncc) : null
        }});
        inserted++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({ ok: true, inserted, skipped });
  } catch (e) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:contents:import", t.end(), status, ok, { classId });
  }
}
