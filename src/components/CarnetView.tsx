import Link from "next/link";
import { effectiveness, type Breakdown, type Carnet } from "@/lib/domain/stats.ts";
import type { ScorersReport } from "@/lib/domain/scorers.ts";
import type { AttendedMatch, Goal } from "@/lib/domain/types.ts";
import type { Team } from "@/lib/repo/teams.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { Jersey } from "./Jersey.tsx";
import { formatDate, pct, recordLine, scoreLine } from "./format.ts";
import { MatchRow } from "./MatchRow.tsx";
import { Mufometro } from "./Mufometro.tsx";
import { RecordBar } from "./RecordBar.tsx";
import { isVisibleClub } from "@/lib/mvp.ts";
import { ScorersSection } from "./ScorersSection.tsx";
import { Centenario } from "./Centenario.tsx";
import { Premios } from "./Premios.tsx";
import type { Achievements } from "@/lib/domain/achievements.ts";
import { ShareCarnet } from "./ShareCarnet.tsx";
import { shareText } from "@/lib/shareText.ts";
import { siteUrl } from "@/lib/site.ts";

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
  memberId,
  club,
  carnet,
  attended,
  scorers,
  goals,
  clubs,
  isOwner,
  achievements,
  isPublic = false,
}: {
  username: string;
  memberId: number;
  club: Team;
  carnet: Carnet;
  attended: AttendedMatch[];
  scorers: ScorersReport;
  goals: Map<string, Goal[]>;
  clubs: Team[];
  isOwner: boolean;
  achievements: Achievements;
  /** Si el carnet es público (para ofrecer compartir el link). */
  isPublic?: boolean;
}) {
  const c = carnet;
  const impact = c.impact;
  const id = clubIdentity(club);
  const since = c.first ? c.first.season : null;
  const phrase =
    c.verdict.key === "cabala" || c.verdict.key === "cabala-absoluta"
      ? id.needsYou
      : c.verdict.key === "yeta" || c.verdict.key === "yeta-total"
        ? "Quizás conviene verlo por la tele…"
        : c.verdict.description;
  return (
    <div className="stack" style={clubStyle(id) as React.CSSProperties}>
      <section className={`socio-card tier-${achievements.tier.key}`}>
        {achievements.tier.key !== "socio" && (
          <div className="tier-ribbon" aria-label={achievements.tier.label}>
            {achievements.tier.label.replace("Carnet ", "")}
          </div>
        )}
        <div className="row" style={{ alignItems: "center", gap: 20 }}>
          <Jersey club={id} size={110} number="12" />
          <div>
            <div className="socio-kicker">Carnet de hincha · {id.nickname}</div>
            <div className="socio-name">@{username}</div>
            <div className="socio-meta">
              {isVisibleClub(club.id) ? <Link href={`/clubes/${club.id}`}>{club.name}</Link> : club.name}
              {id.stadium ? ` · ${id.stadium}` : ""}
            </div>
            <div className="socio-meta">
              Socio N° {String(memberId).padStart(6, "0")}
              {since ? ` · En la galería desde ${since}` : ""}
            </div>
            <div className="cheer">{id.cheer}</div>
          </div>
        </div>
        <div className="mufometro-panel">
          <div className="socio-kicker" style={{ opacity: 0.6 }}>
            Mufómetro
          </div>
          <Mufometro value={c.effectiveness} verdict={c.verdict} />
          <p className="verdict">{c.verdict.label}</p>
          <p className="small" style={{ margin: "4px 0 0", maxWidth: 240, color: "#56655c" }}>
            {phrase}
          </p>
        </div>
      </section>

      <Centenario club={id} total={c.total} owner={isOwner} />
      <Premios a={achievements} owner={isOwner} />
      {isOwner && (
        <ShareCarnet
          username={username}
          isPublic={isPublic}
          text={shareText(c, id.short)}
          url={`${siteUrl()}/hincha/${encodeURIComponent(username)}`}
        />
      )}

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
          <span className="stat-value sm">{recordLine(c.record)}</span>
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
          <h2 className="section-title">Clásicos</h2>
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
          <h2 className="section-title">Finales</h2>
          {c.finals.length === 0 ? (
            <p className="muted">Todavía no marcas ninguna final.</p>
          ) : (
            c.finals.map(({ match, outcome }) => (
              <div key={match.id} className="final-row">
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

      <ScorersSection report={scorers} clubId={club.id} clubs={clubs} />

      <section className="grid grid-2">
        <div className="card">
          <h2 className="section-title">Por temporada</h2>
          <BreakdownTable rows={c.bySeason} label="Año" />
        </div>
        <div className="card">
          <h2 className="section-title">Por competición</h2>
          <BreakdownTable rows={c.byCompetition} label="Competición" />
          <h2 className="section-title section">Rivales más vistos</h2>
          <BreakdownTable rows={c.byOpponent.slice(0, 10)} label="Rival" />
        </div>
      </section>

      <section className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 className="section-title" style={{ margin: 0 }}>Partidos a los que fue</h2>
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
            <MatchRow key={m.id} match={m} highlight={club.id} goals={goals.get(m.id)}>
              {m.mode === "infiltrado" && <span className="pill infiltrado">Infiltrado</span>}
            </MatchRow>
          ))
        )}
      </section>
    </div>
  );
}
