import { afterEach, describe, expect, it } from "vitest";
import type { Db } from "../src/lib/db/client.ts";
import { matchCrowd, matchesBetween } from "../src/lib/repo/matchPage.ts";
import { summarizeCrowd } from "../src/lib/domain/matchPage.ts";
import { ENGINES } from "./engines.ts";

describe.each(ENGINES)("página de partido: %s", (_n, open) => {
  let db: Db;
  afterEach(async () => db?.close());

  it("solo cuenta hinchas públicos y devuelve el historial entre equipos", async () => {
    db = await open();
    await db.exec(`
      INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1);
      INSERT INTO teams (id, name, short_name) VALUES ('a', 'A', 'A'), ('b', 'B', 'B');
    `);
    for (const [id, date] of [["m1", "2024-01-01"], ["m2", "2024-02-01"]]) {
      await db.run(
        `INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source)
         VALUES (?, ?, 2024, 'primera-division', 'a', 'b', 1, 0, 't')`,
        id,
        date,
      );
    }
    for (let i = 0; i < 6; i++) {
      await db.run("INSERT INTO users (username, email, password_hash, club_id, is_public) VALUES (?, ?, 'x', 'a', ?)", `u${i}`, `u${i}@x.cl`, i < 5 ? 1 : 0);
      const id = Number((await db.get("SELECT id FROM users WHERE username = ?", `u${i}`))!.id);
      await db.run("INSERT INTO attendances (user_id, match_id) VALUES (?, 'm1')", id);
    }
    const crowd = await matchCrowd(db, "m1");
    expect(crowd).toHaveLength(5);
    expect(crowd[0]).toEqual({ clubId: "a", played: 1, won: 1, drawn: 0 });
    expect(summarizeCrowd(crowd)?.fans).toBe(5);
    expect(await matchCrowd(db, "m2")).toHaveLength(0);
    expect(await matchesBetween(db, "b", "a")).toHaveLength(2);
  });
});
