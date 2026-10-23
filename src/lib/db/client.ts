import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type Db = DatabaseSync;

const globalForDb = globalThis as unknown as { __galeriaDb?: DatabaseSync };

export function databasePath(): string {
  return path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "data/galeriastats.db");
}

export function openDb(file = databasePath()): DatabaseSync {
  if (file !== ":memory:") mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  migrate(db);
  return db;
}

export function migrate(db: DatabaseSync): void {
  const schema = readFileSync(path.resolve(process.cwd(), "src/lib/db/schema.sql"), "utf8");
  db.exec(schema);
}

/** Conexión compartida del servidor (sobrevive al hot reload en desarrollo). */
export function getDb(): DatabaseSync {
  globalForDb.__galeriaDb ??= openDb();
  return globalForDb.__galeriaDb;
}
