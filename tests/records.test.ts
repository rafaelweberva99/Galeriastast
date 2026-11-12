import { describe, expect, it } from "vitest";
import { clubRecords } from "../src/lib/domain/records.ts";
import { match } from "./fixtures.ts";

const U = "u";
const home = (date: string, hg: number, ag: number, rival = "r") => match({ homeTeamId: U, awayTeamId: rival, awayTeamName: rival, homeTeamName: "U", date, homeGoals: hg, awayGoals: ag });
const away = (date: string, hg: number, ag: number, rival = "r") => match({ homeTeamId: rival, awayTeamId: U, homeTeamName: rival, awayTeamName: "U", date, homeGoals: hg, awayGoals: ag });

describe("récords de un club", () => {
  const ms = [
    home("2024-01-01", 2, 0), // G, sin gol en contra
    away("2024-01-08", 0, 1), // G, sin gol en contra
    home("2024-01-15", 1, 1), // E
    away("2024-01-22", 3, 0), // P
    home("2024-01-29", 4, 0, "grande"), // G (mayor goleada), sin gol en contra
    match({ homeTeamId: U, awayTeamId: "x", date: "2024-02-05", homeGoals: null, awayGoals: null }), // sin jugar: se ignora
  ];
  const r = clubRecords(ms, U);

  it("cuenta solo partidos jugados y arma las rachas", () => {
    expect(r.played).toBe(5);
    expect(r.unbeaten).toEqual({ length: 3, from: "2024-01-01", to: "2024-01-15" });
    expect(r.wins).toEqual({ length: 2, from: "2024-01-01", to: "2024-01-08" });
    expect(r.cleanSheets).toEqual({ length: 2, from: "2024-01-01", to: "2024-01-08" });
  });

  it("local invicto solo mira los partidos de local", () => {
    expect(r.homeUnbeaten.length).toBe(3); // 2-0, 1-1 y 4-0 (el 0-3 de visita no corta la racha de local)
  });

  it("mayor goleada a favor", () => {
    expect(r.biggestWin).toMatchObject({ goalsFor: 4, goalsAgainst: 0, rival: "grande", date: "2024-01-29" });
  });

  it("sin partidos: todo en cero", () => {
    const e = clubRecords([], U);
    expect(e.unbeaten.length).toBe(0);
    expect(e.biggestWin).toBeNull();
  });
});
