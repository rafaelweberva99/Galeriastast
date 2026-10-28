import { clubIdentity } from "@/lib/clubTheme.ts";
import type { ScorersReport, ScorerTally } from "@/lib/domain/scorers.ts";
import type { Team } from "@/lib/repo/teams.ts";
import { formatDate } from "./format.ts";
import { Jersey } from "./Jersey.tsx";

function Spotlight({ title, tally, team, empty }: { title: string; tally?: ScorerTally; team?: Team; empty: string }) {
  return (
    <div className="card spotlight">
      <div className="stat-label">{title}</div>
      {tally ? (
        <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
          {team && <Jersey club={clubIdentity(team)} size={56} />}
          <div style={{ minWidth: 0 }}>
            <div className="display" style={{ fontSize: "1.6rem", margin: 0 }}>
              {tally.player}
            </div>
            <div className="muted small">
              {tally.goals} {tally.goals === 1 ? "gol" : "goles"} en {tally.matches} {tally.matches === 1 ? "partido" : "partidos"}
              {tally.penalties ? ` · ${tally.penalties} de penal` : ""}
              {tally.hatTricks ? ` · ${tally.hatTricks} hat-trick${tally.hatTricks > 1 ? "s" : ""}` : ""}
              {team && !title.includes("ídolo") ? ` · ${team.name}` : ""}
            </div>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          {empty}
        </p>
      )}
    </div>
  );
}

function ScorerTable({ rows, teams, showTeam }: { rows: ScorerTally[]; teams: Map<string, Team>; showTeam: boolean }) {
  if (!rows.length) return <p className="muted">Sin goles registrados todavía.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Jugador</th>
            {showTeam && <th>Equipo</th>}
            <th className="num">Goles</th>
            <th className="num">PJ</th>
            <th className="num">Pen.</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((s) => (
            <tr key={`${s.player}|${s.teamId}`}>
              <td>{s.player}</td>
              {showTeam && <td className="muted">{teams.get(s.teamId)?.shortName ?? s.teamId}</td>}
              <td className="num">
                <strong>{s.goals}</strong>
              </td>
              <td className="num">{s.matches}</td>
              <td className="num">{s.penalties || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Goleadores que viste": ídolo, verdugo, rankings y autogoles. */
export function ScorersSection({
  report,
  clubId,
  clubs,
  perspective = "fan",
}: {
  report: ScorersReport;
  clubId: string;
  clubs: Team[];
  /** "fan": goles vistos por el hincha; "club": historial completo del club. */
  perspective?: "fan" | "club";
}) {
  const teams = new Map(clubs.map((t) => [t.id, t]));
  const fan = perspective === "fan";
  const top = report.idols[0];
  const verdugo = report.executioners[0];
  const noData = report.matchesWithGoals === 0;
  return (
    <section className="stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          {fan ? "Goleadores que viste" : "Goleadores del club"}
        </h2>
        <span className="muted small">
          Con goleadores en {report.matchesWithGoals} de {report.matchesPlayed} partidos
          {fan ? " marcados" : ""}
        </span>
      </div>
      {noData ? (
        <div className="card muted">
          {fan
            ? "Todavía no tenemos los goleadores de los partidos que marcaste. Se mostrarán aquí a medida que se carguen."
            : "Todavía no hay goleadores cargados para este club."}
        </div>
      ) : (
        <>
          <div className="grid grid-3">
            <Spotlight
              title={fan ? "Tu ídolo: máximo goleador que viste" : "Máximo goleador del club"}
              tally={top}
              team={teams.get(clubId)}
              empty="Aún no viste goles de tu club."
            />
            <Spotlight
              title={fan ? "Tu verdugo" : "Su mayor verdugo"}
              tally={verdugo}
              team={verdugo ? teams.get(verdugo.teamId) : undefined}
              empty={fan ? "Ningún rival te ha hecho goles en la galería. ¡Bien!" : "Sin datos."}
            />
            <div className="card">
              <div className="stat-label">{fan ? "Goles que gritaste / sufriste" : "Goles a favor / en contra"}</div>
              <div className="stat-value">
                {report.goalsFor}
                <span className="muted" style={{ fontSize: "0.6em" }}>
                  {" "}
                  / {report.goalsAgainst}
                </span>
              </div>
              <div className="muted small">
                {report.ownGoals.length} autogol{report.ownGoals.length === 1 ? "" : "es"}
                {fan ? " vistos" : ""}
              </div>
            </div>
          </div>
          <div className="grid grid-2">
            <div className="card">
              <h3>{fan ? "Tus goleadores" : "Goleadores históricos"}</h3>
              <ScorerTable rows={report.idols} teams={teams} showTeam={false} />
            </div>
            <div className="card">
              <h3>{fan ? "Verdugos que viste" : "Rivales que más le marcaron"}</h3>
              <ScorerTable rows={report.executioners} teams={teams} showTeam />
            </div>
          </div>
          {report.ownGoals.length > 0 && (
            <div className="card">
              <h3>Autogoles</h3>
              {report.ownGoals.slice(0, 12).map(({ goal, match, inFavor }) => (
                <div key={`${match.id}-${goal.player}-${goal.minute}`} className="final-row">
                  <span>
                    <strong>{goal.player}</strong> <span className="pill og">autogol</span>{" "}
                    {goal.minute !== null ? `${goal.minute}' · ` : ""}
                    {match.homeTeamName} {match.homeGoals}-{match.awayGoals} {match.awayTeamName}
                    <span className="muted small"> · {formatDate(match.date)}</span>
                  </span>
                  <span className={`pill ${inFavor ? "G" : "P"}`}>{inFavor ? "A favor" : "En contra"}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
