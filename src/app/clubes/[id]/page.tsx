import Link from "next/link";
import { clubIdentity, clubStyle, fansLabel } from "@/lib/clubTheme.ts";
import { Jersey } from "@/components/Jersey.tsx";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client.ts";
import { decidedOutcome, effectiveness, involves, recordFor } from "@/lib/domain/stats.ts";
import { listClubMatches } from "@/lib/repo/matches.ts";
import { getTeam, listRivalries } from "@/lib/repo/teams.ts";
import { pct, recordLine, scoreLine } from "@/components/format.ts";
import { RecordBar } from "@/components/RecordBar.tsx";

type Params = Promise<{ id: string }>;

const OUTCOME_LABEL = { G: "Ganada", E: "Empate", P: "Perdida" } as const;

export default async function ClubPage({ params }: { params: Params }) {
  const { id } = await params;
  const db = getDb();
  const club = getTeam(db, id);
  if (!club) notFound();
  const matches = listClubMatches(db, club.id);
  const record = recordFor(matches, club.id);
  const seasons = [...new Set(matches.map((m) => m.season))].sort((a, b) => b - a);
  const finals = matches.filter((m) => m.isFinal);
  const identity = clubIdentity(club);
  const rivalries = listRivalries(db).filter((r) => r.teamA === club.id || r.teamB === club.id);

  return (
    <div className="stack" style={clubStyle(identity) as React.CSSProperties}>
      <div className="club-banner row">
        <Jersey club={identity} size={84} />
        <div>
          <div className="small">{[identity.alias, identity.stadium ?? club.city].filter(Boolean).join(" · ")}</div>
          <h1>{club.name}</h1>
          <span className="muted">
            <Link href={`/rankings/${club.id}`}>Ranking de {fansLabel(identity)}</Link>
          </span>
        </div>
      </div>

      <section className="grid grid-4">
        <div className="card stat">
          <span className="stat-value">{record.played}</span>
          <span className="stat-label">partidos registrados</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{pct(effectiveness(record))}</span>
          <span className="stat-label">efectividad histórica</span>
        </div>
        <div className="card stat">
          <span className="stat-value sm">{recordLine(record)}</span>
          <RecordBar record={record} />
        </div>
        <div className="card stat">
          <span className="stat-value">
            {record.goalsFor}-{record.goalsAgainst}
          </span>
          <span className="stat-label">goles a favor / en contra</span>
        </div>
      </section>

      <section className="grid grid-2">
        <div className="card">
          <h2 className="section-title">Clásicos (historial completo)</h2>
          {rivalries.length === 0 && <p className="muted">Sin clásicos registrados.</p>}
          {rivalries.map((r) => {
            const rival = r.teamA === club.id ? r.teamB : r.teamA;
            const rec = recordFor(matches.filter((m) => involves(m, rival)), club.id);
            return (
              <div key={r.id} style={{ marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{r.name}</strong>
                  <span className="muted small">
                    {rec.played} PJ · {recordLine(rec)} · {pct(effectiveness(rec))}
                  </span>
                </div>
                <RecordBar record={rec} />
              </div>
            );
          })}
        </div>
        <div className="card">
          <h2 className="section-title">Finales</h2>
          {finals.length === 0 && <p className="muted">Sin finales registradas.</p>}
          {finals.map((m) => {
            const o = decidedOutcome(m, club.id);
            return (
              <div key={m.id} className="final-row">
                <span>
                  {m.homeTeamName} {scoreLine(m)} {m.awayTeamName}
                  <span className="muted small"> · {m.tournament}</span>
                </span>
                {o && <span className={`pill ${o}`}>{OUTCOME_LABEL[o]}</span>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Por temporada</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Año</th>
                <th className="num">PJ</th>
                <th className="num">G-E-P</th>
                <th className="num">Goles</th>
                <th className="num">Efect.</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((s) => {
                const r = recordFor(matches.filter((m) => m.season === s), club.id);
                return (
                  <tr key={s}>
                    <td>{s}</td>
                    <td className="num">{r.played}</td>
                    <td className="num">
                      {r.won}-{r.drawn}-{r.lost}
                    </td>
                    <td className="num">
                      {r.goalsFor}-{r.goalsAgainst}
                    </td>
                    <td className="num">{pct(effectiveness(r))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
