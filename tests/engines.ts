import { migratePg, openSqlite, pgDb, type Db, type PgExecutor, type Row } from "../src/lib/db/client.ts";

/** Postgres real en memoria (PGlite) para probar el dialecto de producción sin servidor. */
export async function openPglite(): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite();
  type Q = Pick<InstanceType<typeof PGlite>, "query" | "exec">;
  const wrap = (q: Q, inTx: boolean): PgExecutor => ({
    async query(sql, params) {
      const r = await q.query(sql, params);
      return { rows: r.rows as Row[], affected: r.affectedRows ?? 0 };
    },
    async exec(sql) {
      await q.exec(sql);
    },
    async transaction(fn) {
      return inTx ? fn(wrap(q, true)) : pg.transaction((tx) => fn(wrap(tx, true)));
    },
    async close() {
      await pg.close();
    },
  });
  const db = pgDb(wrap(pg, false));
  await migratePg(db);
  return db;
}

export const ENGINES: [string, () => Promise<Db>][] = [
  ["SQLite", () => openSqlite(":memory:")],
  ["Postgres (PGlite)", openPglite],
];
