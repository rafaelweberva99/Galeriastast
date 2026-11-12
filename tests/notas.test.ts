import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptNote, encryptNote, notesEnabled } from "../src/lib/notesCrypto.ts";
import { openSqlite } from "../src/lib/db/client.ts";
import { exportUserData } from "../src/lib/repo/account.ts";
import { listNotes, NoteError, notesForMatches, saveNote } from "../src/lib/repo/notes.ts";
import { createUser, setSecondClub } from "../src/lib/repo/users.ts";

beforeEach(() => {
  process.env.NOTES_SECRET = "clave-de-prueba";
});
afterEach(() => {
  delete process.env.NOTES_SECRET;
});

async function seed() {
  const db = await openSqlite(":memory:");
  for (const id of ["a", "b", "x"])
    await db.run("INSERT INTO teams (id, name, short_name, color_primary, color_secondary, is_chilean) VALUES (?,?,?,?,?,1)", id, id, id, "#111111", "#ffffff");
  await db.run("INSERT INTO competitions (id, name, kind) VALUES ('c','Liga','liga')");
  const m = (id: string, h: string, a: string) =>
    db.run("INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, is_final, source, verified) VALUES (?,?,?,?,?,?,1,0,0,'t',1)", id, "2024-03-01", 2024, "c", h, a);
  await m("ma", "a", "x");
  await m("mb", "b", "x");
  await m("mx", "x", "x");
  const u1 = await createUser(db, { username: "pepe", email: "p@x.cl", password: "claveSegura123", clubId: "a" });
  const u2 = await createUser(db, { username: "juan", email: "j@x.cl", password: "claveSegura123", clubId: "a" });
  return { db, u1, u2 };
}

describe("notas personales", () => {
  it("cifra: el texto no aparece en claro, y solo abre con la clave y el hincha correctos", () => {
    const enc = encryptNote(1, "Fui con mi papá");
    expect(enc).not.toContain("papá");
    expect(decryptNote(1, enc)).toBe("Fui con mi papá");
    expect(decryptNote(2, enc)).toBeNull(); // otro hincha
    process.env.NOTES_SECRET = "otra-clave";
    expect(decryptNote(1, enc)).toBeNull(); // otra clave
  });

  it("sin clave configurada las notas quedan desactivadas y no se guardan", async () => {
    delete process.env.NOTES_SECRET;
    delete process.env.MAIL_SECRET;
    delete process.env.CRON_SECRET;
    expect(notesEnabled()).toBe(false);
    const { db, u1 } = await seed();
    await expect(saveNote(db, u1, "ma", "hola")).rejects.toBeInstanceOf(NoteError);
  });

  it("guarda cifrado en la base, la lee su dueño y nadie más; vacía la borra", async () => {
    const { db, u1, u2 } = await seed();
    await saveNote(db, u1, "ma", "  Golazo en el último minuto  ");
    const raw = await db.get("SELECT body_enc FROM match_notes WHERE user_id = ?", u1.id);
    expect(String(raw!.body_enc)).not.toContain("Golazo");
    expect((await notesForMatches(db, u1.id, ["ma"])).get("ma")).toBe("Golazo en el último minuto");
    expect((await notesForMatches(db, u2.id, ["ma"])).size).toBe(0);
    await saveNote(db, u1, "ma", "   ");
    expect(await listNotes(db, u1.id)).toHaveLength(0);
  });

  it("solo partidos de su club o su segundo club, y con largo máximo", async () => {
    const { db, u1 } = await seed();
    await expect(saveNote(db, u1, "mb", "x")).rejects.toBeInstanceOf(NoteError);
    await setSecondClub(db, u1, "b");
    await saveNote(db, u1, "mb", "ok");
    await expect(saveNote(db, u1, "ma", "x".repeat(601))).rejects.toBeInstanceOf(NoteError);
  });

  it("la descarga de datos incluye sus notas; se borran con la cuenta (cascada)", async () => {
    const { db, u1 } = await seed();
    await saveNote(db, u1, "ma", "mi nota");
    expect((await exportUserData(db, u1.id)).notes).toEqual([{ matchId: "ma", date: "2024-03-01", text: "mi nota" }]);
    await db.run("DELETE FROM users WHERE id = ?", u1.id);
    expect((await db.get("SELECT COUNT(*) AS n FROM match_notes"))!.n).toBe(0);
  });
});
