import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { openSqlite } from "../src/lib/db/client.ts";
import { fansToRemind, markReminded, optOutReminders } from "../src/lib/repo/emails.ts";
import { newFanNotice, reminderMail, unsubscribeToken, verifyUnsubscribeToken } from "../src/lib/mailTemplates.ts";

const NOW = new Date("2026-11-20T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString().slice(0, 19).replace("T", " ");

async function seed() {
  const db = await openSqlite(":memory:");
  await db.run("INSERT INTO teams (id, name, short_name, color_primary, color_secondary, is_chilean) VALUES ('u','Universidad de Chile','U. de Chile','#0b3a9c','#ffffff',1)");
  await db.run("INSERT INTO competitions (id, name, kind) VALUES ('c','Liga','liga')");
  await db.run("INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, is_final, source, verified) VALUES ('m1','2026-01-01',2026,'c','u','u',1,0,0,'t',1)");
  const add = async (id: number, name: string, ageDays: number) =>
    db.run("INSERT INTO users (id, username, email, password_hash, club_id, created_at) VALUES (?,?,?,?,?,?)", id, name, `${name}@x.cl`, "h", "u", daysAgo(ageDays));
  await add(1, "nuevo", 2); // muy reciente
  await add(2, "justo", 8); // candidato
  await add(3, "marcador", 9); // candidato pero marcó
  await add(4, "viejo", 40); // abandonó hace mucho
  await add(5, "baja", 10); // pidió baja
  await add(6, "ya", 12); // ya recordado
  await add(7, "otro", 15); // candidato
  return db;
}

describe("recordatorio a los 7 días", () => {
  beforeEach(() => {
    process.env.MAIL_SECRET = "secreto-de-prueba";
  });
  afterEach(() => {
    delete process.env.MAIL_SECRET;
  });

  it("elige solo a quien lleva 7-30 días, sin partidos, sin baja y sin recordatorio previo", async () => {
    const db = await seed();
    await db.run("INSERT INTO attendances (user_id, match_id) VALUES (3,'m1')");
    await optOutReminders(db, 5);
    await markReminded(db, 6);
    const ids = (await fansToRemind(db, NOW, 10)).map((f) => f.id);
    expect(ids).toContain(2);
    expect(ids).toContain(7);
    for (const no of [1, 4, 5, 6]) expect(ids).not.toContain(no);
    expect(ids).not.toContain(3);
  });

  it("no repite: tras marcarlo como enviado ya no aparece; respeta el tope por corrida", async () => {
    const db = await seed();
    await markReminded(db, 2);
    await markReminded(db, 2); // idempotente
    expect((await fansToRemind(db, NOW, 10)).map((f) => f.id)).not.toContain(2);
    expect(await fansToRemind(db, NOW, 1)).toHaveLength(1);
  });

  it("la baja de un usuario que no existe no hace nada", async () => {
    const db = await seed();
    expect(await optOutReminders(db, 999)).toBe(false);
  });

  it("token de baja: válido, manipulado y de otro usuario", () => {
    const t = unsubscribeToken(7);
    expect(verifyUnsubscribeToken(t)).toBe(7);
    expect(verifyUnsubscribeToken(t.replace(/^7/, "8"))).toBeNull();
    expect(verifyUnsubscribeToken("basura")).toBeNull();
    expect(verifyUnsubscribeToken("")).toBeNull();
  });

  it("textos: el aviso trae usuario y club (no el correo) y el recordatorio escapa HTML", () => {
    const n = newFanNotice({ username: "pedro22", clubName: "Universidad de Chile", total: 12 });
    expect(n.subject).toBe("Nuevo hincha: @pedro22 (Universidad de Chile)");
    expect(n.text).toContain("12 hinchas registrados");
    const r = reminderMail({ username: "<b>x</b>", clubName: "U", url: "https://galuchastats.com/partidos", unsubscribeUrl: "https://galuchastats.com/baja?t=1.x" });
    expect(r.html).not.toContain("<b>x</b>");
    expect(r.text).toContain("https://galuchastats.com/partidos");
    expect(r.text).toContain("/baja?t=");
  });
});
