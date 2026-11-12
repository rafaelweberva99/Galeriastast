import type { Db } from "./db/client.ts";
import { scorersSeen } from "./domain/scorers.ts";
import { computeAchievements } from "./domain/achievements.ts";
import { buildInsights } from "./domain/insights/index.ts";
import { buildCarnet, involves } from "./domain/stats.ts";
import { buildSuma } from "./domain/suma.ts";
import { goalsForAttended } from "./repo/goals.ts";
import { listAttended, listClubMatches } from "./repo/matches.ts";
import { getTeam, listClubs, listRivalries, teamsByIds } from "./repo/teams.ts";
import type { User } from "./repo/users.ts";
import type { AttendedMatch, Match } from "./domain/types.ts";
import type { Team } from "./repo/teams.ts";

/**
 * Vista "los dos": los partidos del segundo club se cuentan como si fueran del club principal (se cambia solo el id
 * del equipo, los nombres siguen siendo los reales). Un partido entre ambos clubes se queda como está.
 */
function asMainClub(m: AttendedMatch, mainId: string, secondId: string): AttendedMatch;
function asMainClub(m: Match, mainId: string, secondId: string): Match;
function asMainClub(m: Match, mainId: string, secondId: string): Match {
  if (involves(m, mainId) || !involves(m, secondId)) return m;
  return {
    ...m,
    homeTeamId: m.homeTeamId === secondId ? mainId : m.homeTeamId,
    awayTeamId: m.awayTeamId === secondId ? mainId : m.awayTeamId,
  };
}

/** Reúne todo lo necesario para mostrar el carnet de un hincha. `combineWith`: segundo club para la vista de los dos. */
export async function loadCarnet(db: Db, user: User, clubId: string = user.clubId, combineWith?: string) {
  const baseClub = await getTeam(db, clubId);
  if (!baseClub) throw new Error(`Club ${clubId} no existe`);
  const second = combineWith ? await getTeam(db, combineWith) : null;
  if (combineWith && !second) throw new Error(`Club ${combineWith} no existe`);
  // En la vista de los dos, el club "virtual" lleva el id y los colores del principal pero muestra ambos nombres.
  const club: Team = second ? { ...baseClub, name: `${baseClub.name} + ${second.name}`, shortName: `${baseClub.shortName} + ${second.shortName}` } : baseClub;
  const [rawAttended, rivalries, mainMatches, rawGoals, clubs, secondMatches] = await Promise.all([
    listAttended(db, user.id),
    listRivalries(db),
    listClubMatches(db, club.id),
    goalsForAttended(db, user.id),
    listClubs(db),
    second ? listClubMatches(db, second.id) : Promise.resolve([] as Match[]),
  ]);
  // Cada vista muestra solo los partidos del club (o de los dos clubes, en la vista conjunta).
  let allAttended = rawAttended.filter((m) => involves(m, club.id));
  let goals = rawGoals;
  let clubMatches = mainMatches;
  if (second) {
    allAttended = rawAttended.map((m) => asMainClub(m, club.id, second.id)).filter((m) => involves(m, club.id));
    goals = new Map(
      [...rawGoals].map(([mid, gs]) => {
        const orig = rawAttended.find((m) => m.id === mid);
        const moved = orig && !involves(orig, club.id) && involves(orig, second.id);
        return [mid, moved ? gs.map((g) => (g.teamId === second.id ? { ...g, teamId: club.id } : g)) : gs] as const;
      }),
    );
    const seen = new Set(mainMatches.map((m) => m.id));
    clubMatches = [...mainMatches, ...secondMatches.filter((m) => !seen.has(m.id)).map((m) => asMainClub(m, club.id, second.id))];
  }
  // Los partidos marcados que todavía no se juegan ("Voy") se muestran aparte y cuentan cuando se jueguen.
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = allAttended.filter((m) => m.date > today && involves(m, club.id)).sort((a, b) => a.date.localeCompare(b.date));
  const attended = allAttended.filter((m) => m.date <= today);
  const carnet = buildCarnet(attended, club.id, second ? [] : rivalries, clubMatches);
  const insights = buildInsights(attended, clubMatches, club.id, { today });
  const scorers = scorersSeen(attended, goals, club.id);
  const mine = new Set(attended.filter((m) => involves(m, club.id)).map((m) => m.id));
  const achievements = computeAchievements(carnet.total, mine, clubMatches, today);
  // Rivales que no están en la lista de clubes chilenos (selecciones y clubes extranjeros): sus nombres y colores.
  const known = new Set(clubs.map((t) => t.id));
  const missing = [...new Set([...attended, ...upcoming].flatMap((m) => [m.homeTeamId, m.awayTeamId]))].filter((id) => !known.has(id) && id !== club.id);
  const allTeams = missing.length ? [...clubs, ...(await teamsByIds(db, missing))] : clubs;
  return { club, carnet, insights, attended, upcoming, scorers, goals, clubs: allTeams, achievements };
}

/** Suma de los dos clubes del hincha (el principal y el segundo). */
export async function loadSuma(db: Db, user: User, secondClubId: string) {
  const [main, second, allAttended, goals] = await Promise.all([
    getTeam(db, user.clubId),
    getTeam(db, secondClubId),
    listAttended(db, user.id),
    goalsForAttended(db, user.id),
  ]);
  if (!main || !second) throw new Error("Club no existe");
  const today = new Date().toISOString().slice(0, 10);
  const attended = allAttended.filter((m) => m.date <= today);
  return { main, second, suma: buildSuma(attended, main.id, second.id, goals) };
}

/** Qué vista de la Galería se pide con ?club=: la del club principal, la del segundo o la suma. */
export type ClubView = "principal" | "segundo" | "suma";
export function parseClubView(v: string | undefined, hasSecond: boolean): ClubView {
  if (!hasSecond) return "principal";
  return v === "segundo" || v === "suma" ? v : "principal";
}
