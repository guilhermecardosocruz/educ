import { PrismaClient } from "@prisma/client";

/**
 * Reserva o próximo número sequencial de forma atômica, incrementando Class.nextNo
 * em uma única operação no banco (Postgres/Neon).
 *
 * Retorna o número "usado" (new_no - 1) e o "new_no" (após incremento).
 * Lança erro se a turma não existir.
 */
export async function reserveNextNumber(prisma: PrismaClient, classId: string): Promise<{ used: number; newNo: number }> {
  // Usa SQL bruto para obter o valor anterior e o novo na mesma operação.
  const rows = await prisma.$queryRawUnsafe<{ new_no: number }[]>(
    `UPDATE "Class" SET "nextNo" = "nextNo" + 1 WHERE "id" = $1 RETURNING "nextNo" AS new_no`,
    classId
  );
  if (!rows || rows.length === 0) {
    throw Object.assign(new Error("Class not found"), { code: "CLASS_NOT_FOUND" });
  }
  const newNo = Number(rows[0].new_no);
  const used = newNo - 1;
  return { used, newNo };
}
