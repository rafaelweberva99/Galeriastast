import Link from "next/link";
import { effectiveness, type Breakdown, type Carnet } from "@/lib/domain/stats.ts";
import type { AttendedMatch } from "@/lib/domain/types.ts";
import type { Team } from "@/lib/repo/teams.ts";
import { ClubBadge } from "./ClubBadge.tsx";
import { formatDate, pct, recordLine, scoreLine } from "./format.ts";
import { MatchRow } from "./MatchRow.tsx";
import { Mufometro } from "./Mufometro.tsx";
import { RecordBar } from "./RecordBar.tsx";

const OUTCOME_LABEL = { G: "Ganado", E: "Empate", P: "Perdido" } as const;

function BreakdownTable({ rows, label }: { rows: Breakdown[]; label: string }) {
  if (!rows.length) return <p className="muted">Sin datos todavía.</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{label}</th>
            <th className="num">PJ</th>
            <th className="num">G</th>
            <th className="num">E</th>
            <th className="num">P</th>
            <th className="num">Efect.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.label}</td>
              <td className="num">{r.record.played}</td>
              <td className="num">{r.record.won}</td>
              <td className="num">{r.record.drawn}</td>
              <td className="num">{r.record.lost}</td>
              <td className="num">{pct(r.effectiveness)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Memorable({ title, match }: { title: string; match: AttendedMatch | null }) {
  return (
    <div className="card">
      <div className="stat-label">{title}</div>
      {match ? (
        <>
          <div style={{ fontWeight: 700 }}>
            {match.homeTeamName} {scoreLine(match)} {match.awayTeamName}
          </div>
          <div className="muted small">
            {formatDate(match.date)} · {match.competitionName}
          </div>
        </>
      ) : (
        <div className="muted">—</div>
      )}
    </div>
  );
}

export function CarnetView({
  username,
  club,
  carnet,
  attended,
  isOwner,
}: {
  username: string;
  club: Team;
  carnet: Carnet;
  attended: AttendedMatch[];
  isOwner: boolean;
}) {
  const c = carnet;
  const impact = c.impact;
  return (
    <div className="stack">
      <section className="card carnet-head">
        <Mufometro value={c.effectiveness} verdict={c.verdict} />
        <div>
          <div className="row">
            <ClubBadge primary={club.colorPrimary} secondary={club.colorSecondary} />
            <div>
              <h1 style={{ margin: 0 }}>@{username}</h1>
              <Link href={`/clubes/${club.id}`} className="muted">
                Hincha de {club.name}
              </Link>
            </div>
          </div>
          <p className="verdict" style={{ margin: "12px 0 4px" }}>
            {c.verdict.label}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {c.verdict.description}
          </p>
        </div>
      </section>

      <section className="grid grid-4">
        <div className="card stat">
          <span className="stat-value">{c.total}</span>
          <span className="stat-label">partidos en la galería</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{pct(c.effectiveness)}</span>
          <span className="stat-label">efectividad cuando vas</span>
        </div>
        <div className="card stat">
          <span className="stat-value" style={{ color: impact === null ? undefined : impact >= 0 ? "var(--win)" : "var(--loss)" }}>
            {impact === null ? "—" : `${impact >= 0 ? "+" : ""}${impact.toFixed(1)} pts`}
          </span>
          <span className="stat-label">vs. tu club esas temporadas ({pct(c.baselineEffectiveness)})</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{recordLine(c.record)}</span>
          <span className="stat-label">
            goles {c.record.goalsFor}-{c.record.goalsAgainst}
          </span>
          <RecordBar record={c.record} />
        </div>
      </section>

      <section className="grid grid-3">
        <div className="card">
          <h3>De local</h3>
          <p className="muted">
            {recordLine(c.home)} · {pct(effectiveness(c.home))}
          </p>
          <RecordBar record={c.home} />
        </div>
        <div className="card">
          <h3>De visita</h3>
          <p className="muted">
            {recordLine(c.away)} · {pct(effectiveness(c.away))}
          </p>
          <RecordBar record={c.away} />
        </div>
        <div className="card">
          <h3>
            <span className="pill infiltrado">Modo Infiltrado</span>
          </h3>
          <p className="muted">
            {c.infiltrado.played
              ? `${c.infiltrado.played} ${c.infiltrado.played === 1 ? "partido" : "partidos"} escondido en la galería rival · ${recordLine(c.infiltrado)}`
              : "¿Fuiste escondido a la galería rival? También cuenta."}
          </p>
          <RecordBar record={c.infiltrado} />
        </div>
      </section>

      <section className="grid grid-2">
        <div className="card">
          <h2>Clásicos</h2>
          {c.classics.length === 0 ? (
            <p className="muted">Tu club no tiene clásicos registrados.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Clásico</th>
                    <th className="num">PJ</th>
                    <th className="num">G-E-P</th>
                    <th className="num">Efect.</th>
                  </tr>
                </thead>
                <tbody>
                  {c.classics.map((k) => (
                    <tr key={k.rivalry.id}>
                      <td>{k.rivalry.name}</td>
                      <td className="num">{k.record.played}</td>
                      <td className="num">
                        {k.record.won}-{k.record.drawn}-{k.record.lost}
                      </td>
                      <td className="num">{pct(k.effectiveness)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <h2>Finales</h2>
          {c.finals.length === 0 ? (
            <p className="muted">Todavía no marcas ninguna final.</p>
          ) : (
            c.finals.map(({ match, outcome }) => (
              <div key={match.id} className="row" style={{ justifyContent: "space-between", padding: "6px 0" }}>
                <span>
                  {match.homeTeamName} {scoreLine(match)} {match.awayTeamName}
                  <span className="muted small"> · {match.tournament}</span>
                </span>
                {outcome && <span className={`pill ${outcome}`}>{OUTCOME_LABEL[outcome]}</span>}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid grid-4">
        <div className="card stat">
          <span className="stat-value">{c.streaks.longestWin}</span>
          <span className="stat-label">racha más larga ganando</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{c.streaks.longestUnbeaten}</span>
          <span className="stat-label">racha más larga invicto</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{c.streaks.longestWinless}</span>
          <span className="stat-label">racha más larga sin ganar</span>
        </div>
        <div className="card stat">
          <span className="stat-value">
            {c.streaks.current ? `${c.streaks.current.length} ${c.streaks.current.outcome}` : "—"}
          </span>
          <span className="stat-label">racha actual</span>
        </div>
      </section>

      <section className="grid grid-4">
        <Memorable title="Mayor goleada vista" match={c.biggestWin} />
        <Memorable title="Peor derrota vista" match={c.worstDefeat} />
        <Memorable title="Primer partido" match={c.first} />
        <Memorable title="Último partido" match={c.last} />
      </section>

      <section className="grid grid-2">
        <div className="card">
          <h2>Por temporada</h2>
          <BreakdownTable rows={c.bySeason} label="Año" />
        </div>
        <div className="card">
          <h2>Por competición</h2>
          <BreakdownTable rows={c.byCompetition} label="Competición" />
          <h2 className="section">Rivales más vistos</h2>
          <BreakdownTable rows={c.byOpponent.slice(0, 10)} label="Rival" />
        </div>
      </section>

      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Partidos a los que fue</h2>
          {isOwner && (
            <Link className="btn btn-ghost" href="/partidos">
              Marcar más partidos
            </Link>
          )}
        </div>
        {attended.length === 0 ? (
          <p className="muted">Aún no hay partidos marcados.</p>
        ) : (
          [...attended].reverse().map((m) => (
            <MatchRow key={m.id} match={m} highlight={club.id}>
              {m.mode === "infiltrado" && <span className="pill infiltrado">Infiltrado</span>}
            </MatchRow>
          ))
        )}
      </section>
    </div>
  );
}
