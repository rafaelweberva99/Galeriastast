import type { Db } from "../db/client.ts";

/** Partidos marcados por el usuario (jugados o futuros): sirve para saber si ya empezó a cargar. */
export async function countMarked(db: Db, userId: number): Promise<number> {
  const row = await db.get<{ n: number | string }>("SELECT COUNT(*) AS n FROM attendances WHERE user_id = ?", userId);
  return Number(row?.n ?? 0);
}
