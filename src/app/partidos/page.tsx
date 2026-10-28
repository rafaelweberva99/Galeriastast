import Link from "next/link";
import { clubIdentity } from "@/lib/clubTheme.ts";
import { Jersey } from "@/components/Jersey.tsx";
import { requireUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { competitionsForClub, listClubMatches, seasonsForClub } from "@/lib/repo/matches.ts";
import { getTeam, listClubs } from "@/lib/repo/teams.ts";
import { attendanceModes } from "@/lib/repo/users.ts";
import { goalsForMatches } from "@/lib/repo/goals.ts";
import { AttendanceToggle } from "@/components/AttendanceToggle.tsx";
import { MatchRow } from "@/components/MatchRow.tsx";

export const metadata = { title: "Marcar partidos · GaleríaStats" };

type Search = Promise<{ temporada?: string; competicion?: string; rival?: string; solo?: string }>;

export default async function MatchesPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser();
  const sp = await searchParams;
  const db = await getDb();
  const club = (await getTeam(db, user.clubId))!;
  const seasons = await seasonsForClub(db, club.id);
  const season = sp.temporada === "todas" ? undefined : Number(sp.temporada) || seasons[0];
  const modes = await attendanceModes(db, user.id);
  const today = new Date().toISOString().slice(0, 10);
  let matches = (await listClubMatches(db, club.id, {
    season,
    competitionId: sp.competicion || undefined,
    opponent: sp.rival || undefined,
  })).filter((m) => m.date <= today);
  if (sp.solo === "1") matches = matches.filter((m) => modes.has(m.id));
  const goals = await goalsForMatches(db, matches.map((m) => m.id));
  const rivals = (await listClubs(db)).filter((c) => c.id !== club.id);

  return (
    <div className="stack">
      <div className="club-banner row">
        <Jersey club={clubIdentity(club)} size={72} number="12" />
        <div>
          <div className="small">Fecha a fecha · {club.name}</div>
          <h1>¿Dónde estuviste?</h1>
          <p className="muted" style={{ margin: 0 }}>
            {modes.size} partidos marcados · <Link href="/carnet">ver mi carnet</Link> ·{" "}
            <Link href="/importar">importar desde PuntoTicket</Link>
          </p>
        </div>
      </div>

      <form className="card filters" method="get">
        <div className="field">
          <label htmlFor="temporada">Temporada</label>
          <select id="temporada" name="temporada" defaultValue={season ? String(season) : "todas"}>
            <option value="todas">Todas</option>
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="competicion">Competición</label>
          <select id="competicion" name="competicion" defaultValue={sp.competicion ?? ""}>
            <option value="">Todas</option>
            {(await competitionsForClub(db, club.id)).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="rival">Rival</label>
          <select id="rival" name="rival" defaultValue={sp.rival ?? ""}>
            <option value="">Todos</option>
            {rivals.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <label className="row small">
          <input type="checkbox" name="solo" value="1" defaultChecked={sp.solo === "1"} /> Solo los que marqué
        </label>
        <button className="btn">Filtrar</button>
      </form>

      <div className="card">
        {matches.length === 0 ? (
          <p className="muted">No hay partidos con esos filtros.</p>
        ) : (
          matches.map((m) => (
            <MatchRow key={m.id} match={m} highlight={club.id} goals={goals.get(m.id)}>
              <AttendanceToggle matchId={m.id} initial={modes.get(m.id) ?? "ninguno"} />
            </MatchRow>
          ))
        )}
      </div>
    </div>
  );
}
