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

describe("detectProviders", () => {
  it("reconoce las ticketeras de los clubes de Primera", async () => {
    const { detectProviders } = await import("../src/lib/ingest/tickets.ts");
    expect(detectProviders("Tu compra en Passline: Ñublense vs Cobresal").map((p) => p.id)).toEqual(["passline"]);
    expect(detectProviders("OHIPASS · O'Higgins vs Palestino").map((p) => p.id)).toEqual(["ohipass"]);
    expect(detectProviders("coquimbo.ticketplus.cl").map((p) => p.id)).toEqual(["ticketplus"]);
    expect(detectProviders("Ticketmaster Chile - Mis entradas").map((p) => p.id)).toEqual(["ticketmaster"]);
    expect(detectProviders("www.tiendaeverton.cl").map((p) => p.id)).toEqual(["tienda-everton"]);
  });
});

describe("captura de 'Mis compras' de PuntoTicket (fecha de compra, no del partido)", () => {
  it("encuentra cada partido por su rival y la competición, días después de la compra", async () => {
    const { analyzeTicket } = await import("../src/lib/ingest/tickets.ts");
    const db = await openSqlite(":memory:");
    await db.exec(`
      INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1), ('copa-chile', 'Copa Chile', 'copa', 3),
        ('copa-libertadores', 'Copa Libertadores', 'internacional', 5), ('copa-sudamericana', 'Copa Sudamericana', 'internacional', 6);
      INSERT INTO teams (id, name, short_name) VALUES ('colo-colo', 'Colo-Colo', 'Colo-Colo'), ('la-serena', 'Deportes La Serena', 'La Serena'),
        ('deportes-temuco', 'Deportes Temuco', 'Temuco'), ('nublense', 'Ñublense', 'Ñublense'), ('coquimbo-unido', 'Coquimbo Unido', 'Coquimbo'),
        ('cobresal', 'Cobresal', 'Cobresal');
      INSERT INTO teams (id, name, short_name, is_chilean) VALUES ('internacional-bra', 'Internacional', 'Internacional', 0),
        ('river-plate-arg', 'River Plate', 'River Plate', 0), ('alianza-lima-per', 'Alianza Lima', 'Alianza Lima', 0);
      INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source) VALUES
        ('a', '2022-07-10', 2022, 'primera-division', 'colo-colo', 'la-serena', 2, 0, 't'),
        ('b', '2022-06-28', 2022, 'copa-sudamericana', 'colo-colo', 'internacional-bra', 0, 0, 't'),
        ('c', '2022-06-18', 2022, 'copa-chile', 'colo-colo', 'deportes-temuco', 1, 0, 't'),
        ('c2', '2022-06-26', 2022, 'primera-division', 'deportes-temuco', 'colo-colo', 1, 1, 't'),
        ('d', '2022-05-30', 2022, 'primera-division', 'colo-colo', 'nublense', 3, 1, 't'),
        ('e', '2022-05-14', 2022, 'primera-division', 'colo-colo', 'coquimbo-unido', 2, 1, 't'),
        ('f', '2022-04-27', 2022, 'copa-libertadores', 'colo-colo', 'river-plate-arg', 1, 2, 't'),
        ('g', '2022-04-17', 2022, 'primera-division', 'colo-colo', 'cobresal', 1, 0, 't'),
        ('h', '2022-04-13', 2022, 'copa-libertadores', 'colo-colo', 'alianza-lima-per', 1, 0, 't');
    `);
    const ocr = `07-07-2022 Colo-Colo vs. Deportes La Serena - Canje E-Ticket $o Pago
Campeonato PlanVital 2022 - Fecha 17 Aprobado
24-06-2022 Colo-Colo vs. Internacional - Copa Canje E-Ticket $o Entregada
Conmebol Sudamericana 2022
15-06-2022 Colo-Colo vs. Deportes Temuco - Copa Canje E-Ticket so Pago
Chile Easy - Tercera Fase Ida Aprobado
27-05-2022 Colo-Colo vs. Ñublense - Campeonato Canje E-Ticket $o Entregada
PlanVital 2022 - Fecha 15
12-05-2022 Colo-Colo vs. Coquimbo Unido - Canje E-Ticket $o Entregada
Campeonato PlanVital 2022 - Fecha 13
22-04-2022 Colo-Colo vs. River Plate - Copa Canje E-Ticket $o Entregada
Libertadores Jornada 3 Fase de Grupos
14-04-2022 Colo-Colo vs. Cobresal - Campeonato Canje E-Ticket $o Entregada
PlanVital 2022 - Fecha 10
08-04-2022 Colo-Colo vs. Alianza Lima - Copa Canje E-Ticket $o Entregada
Libertadores Jornada 2 Fase de Grupos`;
    const idx = new TeamMentionIndex((await db.all("SELECT id, name, short_name FROM teams")).map((t) => ({ id: String(t.id), name: String(t.name), short: String(t.short_name) })));
    const r = await analyzeTicket(db, "colo-colo", ocr, idx);
    expect(r.candidates.map((c) => c.match.id).sort()).toEqual(["a", "b", "c", "d", "e", "f", "g", "h"]);
    expect(r.unmatchedDates).toEqual([]);
    await db.close();
  });
});

describe("captura de la app (tarjetas: partido arriba, fecha sin año abajo)", () => {
  it("empareja cada fecha con el partido de su tarjeta y usa el día de la semana para el año", async () => {
    const { analyzeTicket } = await import("../src/lib/ingest/tickets.ts");
    const db = await openSqlite(":memory:");
    await db.exec(`
      INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1);
      INSERT INTO teams (id, name, short_name) VALUES ('colo-colo', 'Colo-Colo', 'Colo-Colo'), ('ohiggins', 'O''Higgins', 'O''Higgins'),
        ('nublense', 'Ñublense', 'Ñublense'), ('union-la-calera', 'Unión La Calera', 'La Calera');
      INSERT INTO matches (id, date, season, competition_id, home_team_id, away_team_id, home_goals, away_goals, source) VALUES
        ('ohi-2025', '2025-02-24', 2025, 'primera-division', 'colo-colo', 'ohiggins', 0, 0, 't'),
        ('ohi-2020', '2020-02-24', 2020, 'primera-division', 'colo-colo', 'ohiggins', 1, 0, 't'),
        ('nub-2025', '2025-05-19', 2025, 'primera-division', 'colo-colo', 'nublense', 2, 0, 't'),
        ('cal-2026', '2026-02-15', 2026, 'primera-division', 'colo-colo', 'union-la-calera', 1, 0, 't'),
        ('cal-2015', '2015-09-14', 2015, 'primera-division', 'colo-colo', 'union-la-calera', 1, 1, 't');
    `);
    const ocr = `Colo-Colo vs. O'Higgins
lun. 24 feb. - 20:00 hrs
Estadio Monumental - E-Ticket
Entregada
Colo-Colo vs. Ñublense
lun. 19 may. - 20:00 hrs
Estadio Monumental - E-Ticket
Entregada
Colo-Colo vs. Unión La Calera
dom. 15 feb. - 20:00 hrs
Estadio Monumental - E-Ticket`;
    const idx = new TeamMentionIndex((await db.all("SELECT id, name, short_name FROM teams")).map((t) => ({ id: String(t.id), name: String(t.name), short: String(t.short_name) })));
    const r = await analyzeTicket(db, "colo-colo", ocr, idx);
    // 24-feb fue lunes en 2025 (no en 2020); cada fecha va con el partido de su propia tarjeta.
    expect(r.candidates.map((c) => c.match.id).sort()).toEqual(["cal-2026", "nub-2025", "ohi-2025"]);
    await db.close();
  });
});

describe("captura de 'Mis compras' en fichas (N° de Orden / Fecha Compra / Evento)", () => {
  it("lee cada ficha por rival, temporada y fecha del campeonato, aunque falte la fecha de compra", async () => {
    const { analyzeTicket } = await import("../src/lib/ingest/tickets.ts");
    const { CAPTURE_BREAK } = await import("../src/lib/ticketText.ts");
    const db = await openSqlite(":memory:");
    await db.exec(`
      INSERT INTO competitions VALUES ('primera-division', 'Primera División', 'liga', 1), ('copa-sudamericana', 'Copa Sudamericana', 'internacional', 6);
      INSERT INTO teams (id, name, short_name) VALUES ('universidad-de-chile', 'Universidad de Chile', 'U. de Chile'),
        ('universidad-de-concepcion', 'Universidad de Concepción', 'U. de Concepción'), ('cobresal', 'Cobresal', 'Cobresal'),
        ('everton', 'Everton', 'Everton'), ('universidad-catolica', 'Universidad Católica', 'U. Católica');
      INSERT INTO teams (id, name, short_name, is_chilean) VALUES ('guarani-par', 'Guaraní', 'Guaraní', 0);
      INSERT INTO matches (id, date, season, competition_id, stage, home_team_id, away_team_id, home_goals, away_goals, source) VALUES
        ('cob-25', '2025-08-04', 2025, 'primera-division', 'Fecha 18', 'universidad-de-chile', 'cobresal', 0, 1, 't'),
        ('cob-24', '2024-08-04', 2024, 'primera-division', 'Fecha 18', 'universidad-de-chile', 'cobresal', 2, 0, 't'),
        ('gua-ida', '2025-07-17', 2025, 'copa-sudamericana', 'Ida', 'universidad-de-chile', 'guarani-par', 5, 0, 't'),
        ('gua-vuelta', '2025-07-24', 2025, 'copa-sudamericana', 'Vuelta', 'guarani-par', 'universidad-de-chile', 1, 1, 't'),
        ('eve-25', '2025-11-05', 2025, 'primera-division', 'Fecha 21', 'universidad-de-chile', 'everton', 2, 0, 't'),
        ('cat-26', '2026-04-25', 2026, 'primera-division', 'Fecha 11', 'universidad-de-chile', 'universidad-catolica', 1, 0, 't'),
        ('con-26', '2026-04-27', 2026, 'primera-division', 'Fecha 21', 'universidad-de-concepcion', 'universidad-de-chile', 2, 1, 't');
    `);
    const idx = new TeamMentionIndex((await db.all("SELECT id, name, short_name FROM teams")).map((t) => ({ id: String(t.id), name: String(t.name), short: String(t.short_name) })));
    const shot1 = `20:58
N* de Orden 1111
Fecha Compra 29-07-2025
Evento Universidad de Chile
vs. Cobresal - Liga de
Primera ltaú 2025 -
Fecha 18
Medio Pago Otro
Estado Pago Aprobado
N* de Orden 2222
Fecha Compra 08-07-2025
Evento Universidad de Chile
vs. Guaraní - Conmebol
Sudamericana
Medio Pago Otro
Tipo Envío E-Ticket`;
    // El borde superior corta la ficha: no se ve la fecha de compra ni el nombre del club, solo "Temporada + Fecha 21".
    const shot2 = `Os = il 7 ED
vs. Everton - Liga de
Primera ltaú 2025 -
Fecha 21
Medio Pago Otro
Estado Pago Aprobado
N* de Orden 3333
Fecha Compra 06-10-2025
Evento Despedida Walter
Montillo - Volveremos
Otra Vez
Medio Pago Webpay
Estado Pago Aprobado
N* de Orden 4444
Fecha Compra 15-04-2026
Evento Universidad de Chile
vs. U. Católica - Liga de
Primera - Fecha 11
Medio Pago Mach`;
    const r = await analyzeTicket(db, "universidad-de-chile", [shot1, shot2].join(CAPTURE_BREAK), idx);
    // Sin el partido de Concepción (confundido por "Universidad de"), sin la despedida de Montillo y con la ida (local) de Guaraní.
    expect(r.candidates.map((c) => c.match.id).sort()).toEqual(["cat-26", "cob-25", "eve-25", "gua-ida"]);
    expect(r.unmatchedDates).toEqual([]);
    await db.close();
  });
});
