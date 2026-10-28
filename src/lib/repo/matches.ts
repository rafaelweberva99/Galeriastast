import type { Db, Param, Row } from "../db/client.ts";
import type { AttendanceMode, AttendedMatch, Match } from "../domain/types.ts";

const SELECT_MATCH = `
  SELECT m.id, m.date, m.season, m.competition_id, c.name AS competition_name, c.kind AS competition_kind,
         m.tournament, m.stage, m.home_team_id, ht.name AS home_team_name, m.away_team_id, at.name AS away_team_name,
         m.home_goals, m.away_goals, m.home_pens, m.away_pens, v.name AS venue_name, m.is_final
  FROM matches m
  JOIN competitions c ON c.id = m.competition_id
  JOIN teams ht ON ht.id = m.home_team_id
  JOIN teams at ON at.id = m.away_team_id
  LEFT JOIN venues v ON v.id = m.venue_id`;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export function toMatch(r: Row): Match {
  return {
    id: r.id as string,
    date: r.date as string,
    season: Number(r.season),
    competitionId: r.competition_id as string,
    competitionName: r.competition_name as string,
    competitionKind: r.competition_kind as Match["competitionKind"],
    tournament: (r.tournament as string | null) ?? null,
    stage: (r.stage as string | null) ?? null,
    homeTeamId: r.home_team_id as string,
    homeTeamName: r.home_team_name as string,
    awayTeamId: r.away_team_id as string,
    awayTeamName: r.away_team_name as string,
    homeGoals: num(r.home_goals),
    awayGoals: num(r.away_goals),
    homePens: num(r.home_pens),
    awayPens: num(r.away_pens),
    venueName: (r.venue_name as string | null) ?? null,
    isFinal: Number(r.is_final) === 1,
  };
}

export interface MatchFilter {
  season?: number;
  competitionId?: string;
  opponent?: string;
  limit?: number;
}

export async function listClubMatches(db: Db, clubId: string, f: MatchFilter = {}): Promise<Match[]> {
  const where = ["(m.home_team_id = ? OR m.away_team_id = ?)"];
  const params: Param[] = [clubId, clubId];
  if (f.season) {
    where.push("m.season = ?");
    params.push(f.season);
  }
  if (f.competitionId) {
    where.push("m.competition_id = ?");
    params.push(f.competitionId);
  }
  if (f.opponent) {
    where.push("(m.home_team_id = ? OR m.away_team_id = ?)");
    params.push(f.opponent, f.opponent);
  }
  const sql = `${SELECT_MATCH} WHERE ${where.join(" AND ")} ORDER BY m.date DESC LIMIT ?`;
  params.push(f.limit ?? 5000);
  return (await db.all(sql, ...params)).map(toMatch);
}

export async function getMatch(db: Db, id: string): Promise<Match | null> {
  const row = await db.get(`${SELECT_MATCH} WHERE m.id = ?`, id);
  return row ? toMatch(row) : null;
}

export async function seasonsForClub(db: Db, clubId: string): Promise<number[]> {
  const rows = await db.all(
    "SELECT DISTINCT season FROM matches WHERE home_team_id = ? OR away_team_id = ? ORDER BY season DESC",
    clubId,
    clubId,
  );
  return rows.map((r) => Number(r.season));
}

export async function competitionsForClub(db: Db, clubId: string): Promise<{ id: string; name: string }[]> {
  return db.all<{ id: string; name: string }>(
    `SELECT DISTINCT c.id, c.name, c.tier FROM matches m JOIN competitions c ON c.id = m.competition_id
     WHERE m.home_team_id = ? OR m.away_team_id = ? ORDER BY c.tier, c.name`,
    clubId,
    clubId,
  );
}

export interface DatasetSummary {
  matches: number;
  teams: number;
  competitions: number;
  firstSeason: number | null;
  lastSeason: number | null;
  verifiedPct: number | null;
}

export async function datasetSummary(db: Db): Promise<DatasetSummary> {
  const r = (await db.get(
    `SELECT COUNT(*) AS matches, MIN(season) AS first_season, MAX(season) AS last_season, AVG(verified) AS verified,
            (SELECT COUNT(DISTINCT team) FROM (
               SELECT home_team_id AS team FROM matches WHERE competition_id = 'primera-division'
               UNION SELECT away_team_id FROM matches WHERE competition_id = 'primera-division') AS pro) AS teams,
            (SELECT COUNT(*) FROM competitions) AS competitions
     FROM matches`,
  ))!;
  return {
    matches: Number(r.matches),
    teams: Number(r.teams),
    competitions: Number(r.competitions),
    firstSeason: num(r.first_season),
    lastSeason: num(r.last_season),
    verifiedPct: r.verified === null ? null : Number(r.verified) * 100,
  };
}

export async function listAttended(db: Db, userId: number): Promise<AttendedMatch[]> {
  const sql = `${SELECT_MATCH.replace("SELECT m.id", "SELECT a.mode, m.id")}
    JOIN attendances a ON a.match_id = m.id WHERE a.user_id = ? ORDER BY m.date`;
  return (await db.all(sql, userId)).map((r) => ({ ...toMatch(r), mode: r.mode as AttendanceMode }));
}
