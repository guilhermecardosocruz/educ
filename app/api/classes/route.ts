import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { startTimer, recordApi } from "@/lib/metrics";

export async function GET() {
  const t = startTimer("api:classes:get");
  let status = 200, ok = true;
  try {
    const user = await requireUser();
    const classes = await prisma.class.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, description: true, nextNo: true, createdAt: true, updatedAt: true }
    });
    return NextResponse.json({ ok: true, classes });
  } catch (e) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:classes:get", t.end(), status, ok);
  }
}

export async function POST(req: Request) {
  const t = startTimer("api:classes:post");
  let status = 201, ok = true;
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const name = String(body?.name || "").trim();
    if (name.length < 2) return NextResponse.json({ ok: false, error: "Nome inválido" }, { status: (status = 400) });
    const created = await prisma.class.create({ data: { name, ownerId: user.id } });
    return NextResponse.json({ ok: true, class: created }, { status: 201 });
  } catch (e) {
    status = e instanceof NextResponse ? e.status : 500;
    ok = false;
    if (e instanceof NextResponse) return e;
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status });
  } finally {
    recordApi("api:classes:post", t.end(), status, ok);
  }
}
