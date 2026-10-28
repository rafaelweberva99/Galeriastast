import { describe, expect, it } from "vitest";
import { openSqlite } from "../src/lib/db/client.ts";
import { emailToText, findDates, findTicketMatches, TeamMentionIndex } from "../src/lib/ingest/tickets.ts";

const index = new TeamMentionIndex([
  { id: "colo-colo", name: "Colo-Colo" },
  { id: "universidad-de-chile", name: "Universidad de Chile", short: "U. de Chile" },
  { id: "universidad-de-concepcion", name: "Universidad de Concepción", short: "U. de Concepción" },
  { id: "universidad-catolica", name: "Universidad Católica", short: "U. Católica" },
]);

describe("findDates", () => {
  it("reconoce formatos numéricos y en palabras", () => {
    expect(findDates("Fecha: 10/08/2024 20:00")).toEqual([{ year: 2024, month: 8, day: 10 }]);
    expect(findDates("Domingo 23 de Agosto de 2026")).toEqual([{ year: 2026, month: 8, day: 23 }]);
    expect(findDates("sábado 4 de setiembre")).toEqual([{ year: null, month: 9, day: 4 }]);
    expect(findDates("2024-03-10")).toEqual([{ year: 2024, month: 3, day: 10 }]);
  });

  it("reconoce abreviaturas de capturas de \"Mis compras\" y PDF", () => {
    expect(findDates("Sáb 10 ago 2024 · 20:00 hrs")).toEqual([{ year: 2024, month: 8, day: 10 }]);
    expect(findDates("DOM 23 AGO. 20:00")).toEqual([{ year: null, month: 8, day: 23 }]);
    expect(findDates("10-mar-24")).toEqual([{ year: 2024, month: 3, day: 10 }]);
    expect(findDates("7 sept, 2025")).toEqual([{ year: 2025, month: 9, day: 7 }]);
    expect(findDates("mar 10 de diciembre del 2023")).toEqual([{ year: 2023, month: 12, day: 10 }]);
  });
});

describe("TeamMentionIndex", () => {
  it("encuentra equipos sin confundir nombres que se contienen", () => {
    const sorted = (text: string) => index.find(text).sort();
    expect(sorted("Universidad de Chile vs. Colo-Colo")).toEqual(["colo-colo", "universidad-de-chile"]);
    expect(sorted("evento: udechile-vs-colo-colo-fecha19")).toEqual(["colo-colo", "universidad-de-chile"]);
    expect(sorted("Universidad de Concepción vs Católica")).toEqual(["universidad-catolica", "universidad-de-concepcion"]);
  });
});

describe("emailToText", () => {
  it("decodifica quoted-printable y HTML", () => {
    const eml = "Content-Transfer-Encoding: quoted-printable\n\n<p>Uni=C3=B3n Espa=C3=B1ola &amp; Colo-Co=\nlo</p>";
    expect(emailToText(eml)).toContain("Unión Española & Colo-Colo");
  });

  it("decodifica partes base64", () => {
    const body = Buffer.from("Colo-Colo vs. U. de Chile 10/03/2024").toString("base64");
    const eml = `Content-Type: text/plain; charset=utf-8\nContent-Transfer-Encoding: base64\n\n${body}\n`;
    expect(emailToText(eml)).toContain("Colo-Colo vs. U. de Chile 10/03/2024");
  });
});

describe("findTicketMatches", () => {
  it("propone el partido del club que coincide con fecha (±1 día) y rival", async () => {
    const db = await openSqlite(":memory:");
    await db.exec(`
      INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1);
      INSERT INTO teams (id, name, short_name) VALUES ('colo-colo', 'Colo-Colo', 'Colo-Colo'),
        ('universidad-de-chile', 'Universidad de Chile', 'U. de Chile'), ('everton', 'Everton', 'Everton');
      INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source) VALUES
        ('sc', '2024-03-10', 2024, 'primera-division', 'colo-colo', 'universidad-de-chile', 0, 1, 't'),
        ('ev', '2024-03-10', 2024, 'primera-division', 'everton', 'universidad-de-chile', 1, 1, 't'),
        ('otro', '2024-04-10', 2024, 'primera-division', 'everton', 'colo-colo', 2, 2, 't');
    `);
    const email = "Tu compra en PuntoTicket\nEvento: Colo-Colo vs. Universidad de Chile\nFecha: 11/03/2024 00:30\nOrden 123456";
    const found = await findTicketMatches(db, "colo-colo", email, index);
    expect(found.map((c) => c.match.id)).toEqual(["sc"]);
    expect(await findTicketMatches(db, "colo-colo", "sin fechas", index)).toEqual([]);
  });
});
