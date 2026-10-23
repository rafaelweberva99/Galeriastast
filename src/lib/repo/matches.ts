import type { Db } from "../db/client.ts";
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

type Row = Record<string, unknown>;

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
    homeGoals: r.home_goals === null ? null : Number(r.home_goals),
    awayGoals: r.away_goals === null ? null : Number(r.away_goals),
    homePens: r.home_pens === null ? null : Number(r.home_pens),
    awayPens: r.away_pens === null ? null : Number(r.away_pens),
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

export function listClubMatches(db: Db, clubId: string, f: MatchFilter = {}): Match[] {
  const where = ["(m.home_team_id = ? OR m.away_team_id = ?)"];
  const params: (string | number)[] = [clubId, clubId];
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
  return (db.prepare(sql).all(...params) as Row[]).map(toMatch);
}

export function getMatch(db: Db, id: string): Match | null {
  const row = db.prepare(`${SELECT_MATCH} WHERE m.id = ?`).get(id) as Row | undefined;
  return row ? toMatch(row) : null;
}

export function seasonsForClub(db: Db, clubId: string): number[] {
  const rows = db
    .prepare(
      "SELECT DISTINCT season FROM matches WHERE home_team_id = ? OR away_team_id = ? ORDER BY season DESC",
    )
    .all(clubId, clubId) as Row[];
  return rows.map((r) => Number(r.season));
}

export function competitionsForClub(db: Db, clubId: string): { id: string; name: string }[] {
  return db
    .prepare(
      `SELECT DISTINCT c.id, c.name FROM matches m JOIN competitions c ON c.id = m.competition_id
       WHERE m.home_team_id = ? OR m.away_team_id = ? ORDER BY c.tier, c.name`,
    )
    .all(clubId, clubId) as { id: string; name: string }[];
}

export interface DatasetSummary {
  matches: number;
  teams: number;
  competitions: number;
  firstSeason: number | null;
  lastSeason: number | null;
  verifiedPct: number | null;
}

export function datasetSummary(db: Db): DatasetSummary {
  const r = db
    .prepare(
      `SELECT COUNT(*) AS matches, MIN(season) AS first, MAX(season) AS last, AVG(verified) AS verified,
              (SELECT COUNT(DISTINCT team) FROM (
                 SELECT home_team_id AS team FROM matches WHERE competition_id = 'primera-division'
                 UNION SELECT away_team_id FROM matches WHERE competition_id = 'primera-division')) AS teams,
              (SELECT COUNT(*) FROM competitions) AS competitions
       FROM matches`,
    )
    .get() as Row;
  return {
    matches: Number(r.matches),
    teams: Number(r.teams),
    competitions: Number(r.competitions),
    firstSeason: r.first === null ? null : Number(r.first),
    lastSeason: r.last === null ? null : Number(r.last),
    verifiedPct: r.verified === null ? null : Number(r.verified) * 100,
  };
}

export function listAttended(db: Db, userId: number): AttendedMatch[] {
  const sql = `${SELECT_MATCH.replace("SELECT m.id", "SELECT a.mode, m.id")}
    JOIN attendances a ON a.match_id = m.id WHERE a.user_id = ? ORDER BY m.date`;
  return (db.prepare(sql).all(userId) as Row[]).map((r) => ({ ...toMatch(r), mode: r.mode as AttendanceMode }));
}
