import type { Db } from "../db/client.ts";
import { decryptNote, encryptNote, notesEnabled } from "../notesCrypto.ts";
import { getSecondClubId, type User } from "./users.ts";

export const MAX_NOTE_LENGTH = 600;

export class NoteError extends Error {}

/** Guarda la nota del hincha sobre un partido de su club o de su segundo club (texto vacío = borrarla). */
export async function saveNote(db: Db, user: User, matchId: string, text: string): Promise<void> {
  if (!notesEnabled()) throw new NoteError("Las notas no están disponibles por ahora.");
  const m = await db.get("SELECT home_team_id, away_team_id FROM matches WHERE id = ?", matchId);
  if (!m) throw new NoteError("Partido no encontrado.");
  const second = await getSecondClubId(db, user.id);
  if (![user.clubId, second].some((c) => c && (m.home_team_id === c || m.away_team_id === c)))
    throw new NoteError("Solo puedes escribir notas de partidos de tu club o de tu segundo club.");
  const body = text.trim();
  if (!body) {
    await db.run("DELETE FROM match_notes WHERE user_id = ? AND match_id = ?", user.id, matchId);
    return;
  }
  if (body.length > MAX_NOTE_LENGTH) throw new NoteError(`La nota puede tener hasta ${MAX_NOTE_LENGTH} caracteres.`);
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.run(
    `INSERT INTO match_notes (user_id, match_id, body_enc, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT (user_id, match_id) DO UPDATE SET body_enc = excluded.body_enc, updated_at = excluded.updated_at`,
    user.id,
    matchId,
    encryptNote(user.id, body),
    now,
  );
}

/** Notas del hincha para estos partidos (match_id -> texto). */
export async function notesForMatches(db: Db, userId: number, matchIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!notesEnabled() || matchIds.length === 0) return out;
  const wanted = new Set(matchIds);
  for (const r of await db.all("SELECT match_id, body_enc FROM match_notes WHERE user_id = ?", userId)) {
    if (!wanted.has(r.match_id as string)) continue;
    const t = decryptNote(userId, r.body_enc as string);
    if (t) out.set(r.match_id as string, t);
  }
  return out;
}

export interface NoteEntry {
  matchId: string;
  date: string;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  text: string;
  updatedAt: string;
}

/** Todas las notas del hincha, de la más reciente a la más antigua del partido. */
export async function listNotes(db: Db, userId: number): Promise<NoteEntry[]> {
  if (!notesEnabled()) return [];
  const rows = await db.all(
    `SELECT n.match_id, n.body_enc, n.updated_at, m.date, th.name AS home, ta.name AS away, m.home_goals, m.away_goals
       FROM match_notes n JOIN matches m ON m.id = n.match_id
       JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
      WHERE n.user_id = ? ORDER BY m.date DESC, n.match_id`,
    userId,
  );
  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  const out: NoteEntry[] = [];
  for (const r of rows) {
    const text = decryptNote(userId, r.body_enc as string);
    if (text === null) continue;
    out.push({ matchId: r.match_id as string, date: r.date as string, home: r.home as string, away: r.away as string, homeGoals: num(r.home_goals), awayGoals: num(r.away_goals), text, updatedAt: r.updated_at as string });
  }
  return out;
}
