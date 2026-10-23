import type { Db } from "./db/client.ts";
import { buildCarnet } from "./domain/stats.ts";
import { listAttended, listClubMatches } from "./repo/matches.ts";
import { getTeam, listRivalries } from "./repo/teams.ts";
import type { User } from "./repo/users.ts";

/** Reúne todo lo necesario para mostrar el carnet de un hincha. */
export function loadCarnet(db: Db, user: User) {
  const club = getTeam(db, user.clubId);
  if (!club) throw new Error(`Club ${user.clubId} no existe`);
  const attended = listAttended(db, user.id);
  const carnet = buildCarnet(attended, club.id, listRivalries(db), listClubMatches(db, club.id));
  return { club, carnet, attended };
}
