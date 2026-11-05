import type { Db } from "../db/client.ts";
import {
  type CommunityComparison,
  fanEffectiveness,
  type FanLine,
  mean,
  percentileRank,
  privacyGate,
  rankDesc,
  type VerdictShares,
  verdictShares,
} from "../domain/community.ts";
import { CURRENT_SEASON } from "../ticketing.ts";

const today = () => new Date().toISOString().slice(0, 10); // lo que aún no se juega no cuenta

/** Un hincha con sus conteos. `attended` = todos los partidos marcados; `played/won/drawn` = los de su club. */
interface FanRow extends FanLine {
  id: number;
  username: string;
  clubId: string;
  attended: number;
}

const FAN_SELECT = `SELECT u.id, u.username, u.club_id,
       COUNT(m.id) AS attended,
       COALESCE(SUM(CASE WHEN m.home_goals IS NOT NULL AND (m.home_team_id = u.club_id OR m.away_team_id = u.club_id) THEN 1 ELSE 0 END), 0) AS played,
       COALESCE(SUM(CASE WHEN m.home_goals IS NOT NULL AND
             ((m.home_team_id = u.club_id AND m.home_goals > m.away_goals) OR
              (m.away_team_id = u.club_id AND m.away_goals > m.home_goals)) THEN 1 ELSE 0 END), 0) AS won,
       COALESCE(SUM(CASE WHEN m.home_goals IS NOT NULL AND (m.home_team_id = u.club_id OR m.away_team_id = u.club_id)
             AND m.home_goals = m.away_goals THEN 1 ELSE 0 END), 0) AS drawn
     FROM users u
     LEFT JOIN attendances a ON a.user_id = u.id
     LEFT JOIN matches m ON m.id = a.match_id AND m.date <= ?`;

function toFan(r: Record<string, unknown>): FanRow {
  return {
    id: Number(r.id),
    username: r.username as string,
    clubId: r.club_id as string,
    attended: Number(r.attended),
    played: Number(r.played),
    won: Number(r.won),
    drawn: Number(r.drawn),
  };
}

/** Todos los hinchas con perfil público (solo ellos entran a cualquier agregado). */
async function publicFans(db: Db, clubId?: string): Promise<FanRow[]> {
  const rows = await db.all(
    `${FAN_SELECT} WHERE u.is_public = 1${clubId ? " AND u.club_id = ?" : ""} GROUP BY u.id, u.username, u.club_id`,
    ...(clubId ? [today(), clubId] : [today()]),
  );
  return rows.map(toFan);
}

export interface ClubCommunity {
  clubId: string;
  /** Hinchas públicos (siempre se muestra: es un conteo del propio ranking de hinchadas). */
  fans: number;
  /** Cifras agregadas: null si hay menos de 5 hinchas detrás ("pocos datos"). */
  attended: number | null;
  avgAttended: number | null;
  /** Mufómetro medio de la hinchada: promedio de la efectividad de cada hincha con veredicto. */
  avgEffectiveness: number | null;
  shares: VerdictShares | null;
}

function summarize(clubId: string, fans: FanRow[]): ClubCommunity {
  const n = fans.length;
  const total = fans.reduce((s, f) => s + f.attended, 0);
  const effs = fans.map(fanEffectiveness).filter((e): e is number => e !== null);
  return {
    clubId,
    fans: n,
    attended: privacyGate(n, total),
    avgAttended: privacyGate(n, total / Math.max(n, 1)),
    avgEffectiveness: privacyGate(effs.length, mean(effs)),
    shares: verdictShares(effs),
  };
}

export interface CommunityOverview {
  /** Hinchas públicos de todos los clubes y sus partidos marcados (null bajo el mínimo). */
  totalFans: number;
  totalAttended: number | null;
  clubs: ClubCommunity[];
}

/** Panorama: una fila por club con al menos un hincha público. */
export async function communityOverview(db: Db): Promise<CommunityOverview> {
  const fans = await publicFans(db);
  const byClub = new Map<string, FanRow[]>();
  for (const f of fans) byClub.set(f.clubId, [...(byClub.get(f.clubId) ?? []), f]);
  return {
    totalFans: fans.length,
    totalAttended: privacyGate(
      fans.length,
      fans.reduce((s, f) => s + f.attended, 0),
    ),
    clubs: [...byClub].map(([id, list]) => summarize(id, list)),
  };
}

export interface MostMarkedMatch {
  matchId: string;
  date: string;
  season: number;
  home: string;
  away: string;
  homeGoals: number | null;
  awayGoals: number | null;
  /** Hinchas del club que lo marcaron. */
  fans: number;
}

/** Partidos de `clubId` más marcados por su hinchada (mínimo 2 hinchas, para no apuntar a una sola persona). */
export async function mostMarkedMatches(db: Db, clubId: string, opts: { season?: number; limit?: number } = {}): Promise<MostMarkedMatch[]> {
  const rows = await db.all(
    `SELECT m.id, m.date, m.season, m.home_goals, m.away_goals, ht.short_name AS home, aw.short_name AS away, COUNT(*) AS fans
       FROM attendances a
       JOIN users u ON u.id = a.user_id AND u.is_public = 1 AND u.club_id = ?
       JOIN matches m ON m.id = a.match_id AND (m.home_team_id = u.club_id OR m.away_team_id = u.club_id) AND m.date <= ?
       JOIN teams ht ON ht.id = m.home_team_id
       JOIN teams aw ON aw.id = m.away_team_id
      ${opts.season ? "WHERE m.season = ?" : ""}
      GROUP BY m.id, m.date, m.season, m.home_goals, m.away_goals, ht.short_name, aw.short_name
     HAVING COUNT(*) >= 2
      ORDER BY fans DESC, m.date DESC, m.id
      LIMIT ?`,
    clubId,
    today(),
    ...(opts.season ? [opts.season] : []),
    opts.limit ?? 10,
  );
  return rows.map((r) => ({
    matchId: r.id as string,
    date: r.date as string,
    season: Number(r.season),
    home: r.home as string,
    away: r.away as string,
    homeGoals: r.home_goals === null ? null : Number(r.home_goals),
    awayGoals: r.away_goals === null ? null : Number(r.away_goals),
    fans: Number(r.fans),
  }));
}

export interface ScorerSeen {
  player: string;
  /** Equipo del jugador (solo relevante para los verdugos). */
  team: string | null;
  /** Goles vistos, sumando a cada hincha que estuvo en el partido. */
  goals: number;
  /** Hinchas distintos que lo vieron convertir. */
  fans: number;
}

/** Goleadores del club (`for`) o verdugos, es decir rivales que le convirtieron (`against`), vistos por la hinchada. */
export async function scorersSeenByFans(db: Db, clubId: string, side: "for" | "against", limit = 5): Promise<ScorerSeen[]> {
  const against = side === "against";
  const rows = await db.all(
    `SELECT g.player, ${against ? "t.short_name" : "NULL"} AS team, COUNT(*) AS goals, COUNT(DISTINCT a.user_id) AS fans
       FROM goals g
       JOIN matches m ON m.id = g.match_id AND m.date <= ?
       JOIN attendances a ON a.match_id = m.id
       JOIN users u ON u.id = a.user_id AND u.is_public = 1 AND u.club_id = ?
       ${against ? "JOIN teams t ON t.id = g.team_id" : ""}
      WHERE g.own_goal = 0 AND ${
        against ? "g.team_id <> ? AND (m.home_team_id = ? OR m.away_team_id = ?)" : "g.team_id = ?"
      }
      GROUP BY g.player${against ? ", t.short_name" : ""}
      ORDER BY goals DESC, fans DESC, g.player
      LIMIT ?`,
    today(),
    clubId,
    ...(against ? [clubId, clubId, clubId] : [clubId]),
    limit,
  );
  return rows.map((r) => ({
    player: r.player as string,
    team: (r.team as string | null) ?? null,
    goals: Number(r.goals),
    fans: Number(r.fans),
  }));
}

export interface FaithfulFan {
  rank: number;
  username: string;
  attended: number;
}

export interface ClubCommunityDetail extends ClubCommunity {
  season: number;
  topSeason: MostMarkedMatch[];
  topAllTime: MostMarkedMatch[];
  faithful: FaithfulFan[];
  scorersFor: ScorerSeen[];
  scorersAgainst: ScorerSeen[];
}

/** Detalle de un club. Las listas agregadas quedan vacías si no se alcanza el mínimo de hinchas. */
export async function clubCommunityDetail(db: Db, clubId: string): Promise<ClubCommunityDetail> {
  const fans = await publicFans(db, clubId);
  const base = summarize(clubId, fans);
  const enough = base.attended !== null;
  const faithful = rankDesc(fans.filter((f) => f.attended > 0), (f) => f.attended, (f) => f.username)
    .slice(0, 10)
    .map((r) => ({ rank: r.rank, username: r.item.username, attended: r.item.attended }));
  const [topSeason, topAllTime, scorersFor, scorersAgainst] = enough
    ? await Promise.all([
        mostMarkedMatches(db, clubId, { season: CURRENT_SEASON, limit: 10 }),
        mostMarkedMatches(db, clubId, { limit: 10 }),
        scorersSeenByFans(db, clubId, "for", 5),
        scorersSeenByFans(db, clubId, "against", 5),
      ])
    : [[], [], [], []];
  return { ...base, season: CURRENT_SEASON, topSeason, topAllTime, faithful, scorersFor, scorersAgainst };
}

/**
 * Comparación del hincha con su hinchada para el carnet. null si en su club hay menos de 5 hinchas públicos.
 * Si su perfil es privado igual se compara (es su propio carnet), pero él no cuenta para el mínimo ni se
 * revela a los demás.
 */
export async function communityComparison(db: Db, userId: number): Promise<CommunityComparison | null> {
  const meRows = await db.all(`${FAN_SELECT} WHERE u.id = ? GROUP BY u.id, u.username, u.club_id`, today(), userId);
  if (meRows.length === 0) return null;
  const me = toFan(meRows[0]);
  const others = (await publicFans(db, me.clubId)).filter((f) => f.id !== me.id);
  const isPublic = Number((await db.get("SELECT is_public FROM users WHERE id = ?", userId))?.is_public) === 1;
  const publicCount = others.length + (isPublic ? 1 : 0);
  if (privacyGate(publicCount, true) === null) return null;
  const attendedPct = percentileRank(me.attended, others.map((f) => f.attended))!;
  const attendedRank = 1 + others.filter((f) => f.attended > me.attended).length;
  const myEff = fanEffectiveness(me);
  const otherEffs = others.map(fanEffectiveness).filter((e): e is number => e !== null);
  // La efectividad solo se compara si hay suficientes hinchas con veredicto (mismo mínimo de privacidad).
  const effOk = myEff !== null && otherEffs.length + 1 >= 5;
  return {
    clubId: me.clubId,
    fans: publicCount,
    attended: me.attended,
    attendedRank,
    attendedOf: others.length + 1,
    attendedPercentile: Math.round(attendedPct),
    effectiveness: myEff,
    effectivenessPercentile: effOk ? Math.round(percentileRank(myEff, otherEffs)!) : null,
    effectivenessRank: effOk ? 1 + otherEffs.filter((e) => e > myEff).length : null,
    effectivenessOf: effOk ? otherEffs.length + 1 : null,
  };
}
