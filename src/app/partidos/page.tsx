import { AutoFilterForm } from "@/components/AutoFilterForm.tsx";
import { Paged } from "@/components/Paged.tsx";
import Link from "next/link";
import { clubIdentity } from "@/lib/clubTheme.ts";
import { Jersey } from "@/components/Jersey.tsx";
import { requireUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { competitionsForClub, listClubMatches, seasonsForClub, upcomingClubMatches } from "@/lib/repo/matches.ts";
import { UpcomingMatches } from "@/components/UpcomingMatches.tsx";
import { getTeam, listClubs } from "@/lib/repo/teams.ts";
import { attendanceModes, getSecondClubId } from "@/lib/repo/users.ts";
import { goalsForMatches } from "@/lib/repo/goals.ts";
import { AttendanceToggle } from "@/components/AttendanceToggle.tsx";
import { MatchRow } from "@/components/MatchRow.tsx";

export const metadata = { title: "Marcar partidos · GaluchaStats" };

type Search = Promise<{ temporada?: string; competicion?: string; rival?: string; solo?: string; club?: string }>;

export default async function MatchesPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser();
  const sp = await searchParams;
  const db = await getDb();
  const secondId = await getSecondClubId(db, user.id);
  const showSecond = !!secondId && sp.club === "segundo";
  const club = (await getTeam(db, showSecond ? secondId : user.clubId))!;
  const mainTeam = showSecond ? await getTeam(db, user.clubId) : club;
  const secondTeam = secondId ? (showSecond ? club : await getTeam(db, secondId)) : null;
  const seasons = await seasonsForClub(db, club.id);
  const season = sp.temporada === "todas" ? undefined : Number(sp.temporada) || seasons[0];
  const modes = await attendanceModes(db, user.id);
  const today = new Date().toISOString().slice(0, 10);
  let matches = (await listClubMatches(db, club.id, {
    season,
    competitionId: sp.competicion || undefined,
    opponent: sp.rival || undefined,
  }));
  if (sp.solo === "1") matches = matches.filter((m) => modes.has(m.id));
  const goals = await goalsForMatches(db, matches.map((m) => m.id));
  const upcoming = await upcomingClubMatches(db, club.id, today, 5);
  const rivals = (await listClubs(db)).filter((c) => c.id !== club.id);

  return (
    <div className="stack">
      <div className="club-banner row">
        <Jersey club={clubIdentity(club)} size={72} number="12" />
        <div>
          <div className="small">Fecha a fecha · {club.name}</div>
          <h1>¿Dónde estuviste?</h1>
          <p className="muted" style={{ margin: 0 }}>
            {modes.size} partidos marcados · <Link href="/carnet">ver mi Galería</Link> ·{" "}
            <Link href="/importar">importar entradas</Link>
          </p>
        </div>
      </div>

      {modes.size === 0 && (
        <div className="card mark-help">
          <strong>Así se marca:</strong> elige la temporada, y en cada partido al que fuiste toca <em>Fui</em> (o <em>Infiltrado</em> si
          estuviste en la galería rival). Se guarda solo.{" "}
          <span className="muted">
            ¿Compraste en línea? Es más rápido <Link href="/importar">subir una captura de tus entradas</Link>.
          </span>
        </div>
      )}

      {secondTeam && mainTeam && (
        <nav className="club-switch" aria-label="Elegir club">
          <Link href="/partidos" className={showSecond ? undefined : "is-active"}>
            {mainTeam.shortName}
          </Link>
          <Link href="/partidos?club=segundo" className={showSecond ? "is-active" : undefined}>
            {secondTeam.shortName}
          </Link>
        </nav>
      )}

      <UpcomingMatches matches={upcoming} clubId={club.id} clubs={rivals} />

      <AutoFilterForm className="card filters">
        {showSecond && <input type="hidden" name="club" value="segundo" />}
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
      </AutoFilterForm>

      <div className="card filter-results">
        {matches.length === 0 ? (
          <p className="muted">No hay partidos con esos filtros.</p>
        ) : (
          <Paged>
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} highlight={club.id} goals={goals.get(m.id)}>
                <AttendanceToggle matchId={m.id} initial={modes.get(m.id) ?? "ninguno"} upcoming={m.date > today} />
              </MatchRow>
            ))}
          </Paged>
        )}
      </div>
      {modes.size > 0 && (
        <div className="mark-bar" role="status">
          <span>
            <strong>{modes.size}</strong> {modes.size === 1 ? "partido marcado" : "partidos marcados"}
          </span>
          <Link className="btn" href="/carnet">
            Ver mi Galería →
          </Link>
        </div>
      )}
    </div>
  );
}
