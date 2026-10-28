/**
 * Acceso a la base de datos con una sola interfaz para dos motores:
 *  - Postgres (producción en Vercel + Neon) cuando existe DATABASE_URL / POSTGRES_URL.
 *  - SQLite vía node:sqlite (desarrollo local y tests) en el resto de los casos.
 * El SQL de la app se escribe con placeholders `?` y en el subconjunto común a ambos motores.
 */
import path from "node:path";
import type { Sql, TransactionSql } from "postgres";
import { schemaFor } from "./schema.ts";

export type Param = string | number | null;
export type Row = Record<string, unknown>;

export interface Db {
  readonly dialect: "sqlite" | "pg";
  all<T = Row>(sql: string, ...params: Param[]): Promise<T[]>;
  get<T = Row>(sql: string, ...params: Param[]): Promise<T | undefined>;
  /** Ejecuta una sentencia y devuelve la cantidad de filas afectadas. */
  run(sql: string, ...params: Param[]): Promise<number>;
  /** Ejecuta varias sentencias sin parámetros (migraciones). */
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

/** "a = ? AND b = ?" -> "a = $1 AND b = $2" (el SQL de la app no usa "?" dentro de literales). */
export function toPgPlaceholders(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// --- SQLite -------------------------------------------------------------------

export async function openSqlite(file: string): Promise<Db> {
  const { DatabaseSync } = await import("node:sqlite");
  if (file !== ":memory:") {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(path.dirname(file), { recursive: true });
  }
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const db: Db = {
    dialect: "sqlite",
    async all<T>(sql: string, ...params: Param[]) {
      return raw.prepare(sql).all(...params) as T[];
    },
    async get<T>(sql: string, ...params: Param[]) {
      return raw.prepare(sql).get(...params) as T | undefined;
    },
    async run(sql: string, ...params: Param[]) {
      return Number(raw.prepare(sql).run(...params).changes);
    },
    async exec(sql: string) {
      raw.exec(sql);
    },
    async transaction<T>(fn: (tx: Db) => Promise<T>) {
      raw.exec("BEGIN");
      try {
        const out = await fn(db);
        raw.exec("COMMIT");
        return out;
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      }
    },
    async close() {
      raw.close();
    },
  };
  await db.exec(schemaFor("sqlite"));
  return db;
}

// --- Postgres -----------------------------------------------------------------

/** Mínimo común entre el cliente `postgres` (producción) y PGlite (tests). */
export interface PgExecutor {
  query(sql: string, params: Param[]): Promise<{ rows: Row[]; affected: number }>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: PgExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function pgDb(ex: PgExecutor): Db {
  const db: Db = {
    dialect: "pg",
    async all<T>(sql: string, ...params: Param[]) {
      return (await ex.query(toPgPlaceholders(sql), params)).rows as T[];
    },
    async get<T>(sql: string, ...params: Param[]) {
      return (await ex.query(toPgPlaceholders(sql), params)).rows[0] as T | undefined;
    },
    async run(sql: string, ...params: Param[]) {
      return (await ex.query(toPgPlaceholders(sql), params)).affected;
    },
    exec: (sql) => ex.exec(sql),
    transaction: (fn) => ex.transaction((tx) => fn(pgDb(tx))),
    close: () => ex.close(),
  };
  return db;
}

export async function migratePg(db: Db): Promise<void> {
  try {
    await db.exec(schemaFor("pg"));
  } catch (e) {
    // Dos arranques en frío simultáneos pueden competir creando tablas; el segundo intento ya las encuentra.
    await new Promise((r) => setTimeout(r, 500));
    await db.exec(schemaFor("pg")).catch(() => {
      throw e;
    });
  }
}

export async function openPostgres(url: string): Promise<Db> {
  const { default: postgres } = await import("postgres");
  // prepare: false para funcionar detrás del pooler de Neon (PgBouncer en modo transacción).
  const sql = postgres(url, { max: 3, prepare: false, idle_timeout: 20, onnotice: () => {} });
  const wrap = (s: Sql | TransactionSql): PgExecutor => ({
    async query(text, params) {
      const res = await s.unsafe(text, params as never[]);
      return { rows: res as unknown as Row[], affected: res.count ?? 0 };
    },
    async exec(text) {
      await s.unsafe(text);
    },
    async transaction(fn) {
      // Dentro de una transacción se anida con un savepoint; fuera, se abre una transacción nueva.
      if ("savepoint" in s) return (await s.savepoint((tx) => fn(wrap(tx)))) as never;
      return (await sql.begin((tx) => fn(wrap(tx)))) as never;
    },
    async close() {
      await sql.end();
    },
  });
  const db = pgDb(wrap(sql));
  await migratePg(db);
  return db;
}

// --- Conexión de la app -------------------------------------------------------

export function databaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

export function databasePath(): string {
  return path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "data/galeriastats.db");
}

export async function openDb(target?: string): Promise<Db> {
  if (target) return target.startsWith("postgres") ? openPostgres(target) : openSqlite(target);
  const url = databaseUrl();
  if (url) return openPostgres(url);
  if (process.env.VERCEL) {
    throw new Error(
      "Falta la base de datos: en Vercel ve a Storage → Create Database → Neon y conéctala a este proyecto (crea DATABASE_URL).",
    );
  }
  return openSqlite(databasePath());
}

const globalForDb = globalThis as unknown as { __galeriaDb?: Promise<Db> };

/** Conexión compartida del servidor (sobrevive al hot reload en desarrollo). */
export function getDb(): Promise<Db> {
  globalForDb.__galeriaDb ??= openDb().catch((e) => {
    globalForDb.__galeriaDb = undefined;
    throw e;
  });
  return globalForDb.__galeriaDb;
}
