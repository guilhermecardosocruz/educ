import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, ctx: Ctx) {
  const id = ctx?.params?.id;
  if (!id) return NextResponse.json({ ok: false, error: "ID ausente" }, { status: 400 });

  try {
    const user = await requireUser();

    const cls = await prisma.class.findUnique({
      where: { id },
      select: { ownerId: true, nextNo: true }
    });

    if (!cls || cls.ownerId !== user.id) {
      return NextResponse.json({ ok: false, error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, nextNo: cls.nextNo });
  } catch (resp) {
    if (resp instanceof NextResponse) return resp;
    console.error(`GET /api/classes/${id}/next-number error:`, resp);
    return NextResponse.json({ ok: false, error: "Internal Error" }, { status: 500 });
  }
}
