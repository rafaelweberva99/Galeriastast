import type { Db } from "./db/client.ts";
import { buildResumen, yearsWithMatches, type Resumen } from "./domain/resumen.ts";
import { goalsForAttended } from "./repo/goals.ts";
import { listAttended, listClubMatches } from "./repo/matches.ts";
import { getTeam, listRivalries } from "./repo/teams.ts";
import type { User } from "./repo/users.ts";

/** Texto para compartir el resumen anual en X u otras redes. */
export function resumenShareText(r: Resumen, clubShort: string): string {
  if (r.played === 0) return `Armé mi carnet de hincha de ${clubShort} en GaluchaStats.`;
  const eff = r.effectiveness === null ? "" : ` con ${Math.round(r.effectiveness)}% de efectividad`;
  return `Mi ${r.year} en la galería: ${r.played} ${r.played === 1 ? "partido" : "partidos"} de ${clubShort}${eff} (${r.record.won}G-${r.record.drawn}E-${r.record.lost}P). Me dicen "${r.title.label}". ¿Y el tuyo?`;
}

/** Reúne lo necesario para el resumen anual de un hincha: el resumen del año y los años disponibles. */
export async function loadResumen(db: Db, user: User, year: number) {
  const club = await getTeam(db, user.clubId);
  if (!club) throw new Error(`Club ${user.clubId} no existe`);
  const [allAttended, rivalries, clubMatches, goals] = await Promise.all([
    listAttended(db, user.id),
    listRivalries(db),
    listClubMatches(db, club.id),
    goalsForAttended(db, user.id),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const attended = allAttended.filter((m) => m.date <= today);
  const years = yearsWithMatches(attended, club.id);
  const resumen = buildResumen({ year, clubId: club.id, attended, goals, clubMatches, rivalries });
  return { club, resumen, years };
}
