import Link from "next/link";
import { Mufometro } from "@/components/Mufometro.tsx";
import { Jersey } from "@/components/Jersey.tsx";
import { MatchRow } from "@/components/MatchRow.tsx";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { duelRows, duelVerdict, headline, rowTally, type FanSide } from "@/lib/domain/comparar.ts";
import { verdict as mufoVerdict } from "@/lib/domain/stats.ts";
import type { Duelo as DueloData } from "@/lib/comparar.ts";
import { formatDate, scoreLine } from "@/components/format.ts";
import { scorersLine } from "@/lib/domain/scorers.ts";
import type { ScorersReport } from "@/lib/domain/scorers.ts";

function Side({ fan, club, tag }: { fan: FanSide; club: DueloData["clubA"]; tag: "a" | "b" }) {
  const id = clubIdentity(club);
  const v = mufoVerdict({ played: fan.played, won: fan.won, drawn: fan.drawn, lost: fan.lost, goalsFor: fan.goalsFor, goalsAgainst: fan.goalsAgainst });
  return (
    <div className={`cmp-side cmp-side-${tag}`} style={clubStyle(id)}>
      <Jersey club={id} size={72} />
      <Link href={`/hincha/${encodeURIComponent(fan.username)}`} className="cmp-handle">
        @{fan.username}
      </Link>
      <span className="cmp-club">{fan.clubName}</span>
      <span className="cmp-meta">
        Socio N° {String(fan.memberId).padStart(6, "0")} · {fan.tierLabel}
      </span>
      <Mufometro value={fan.effectiveness} verdict={v} />
      <span className="cmp-verdict-pill">{fan.verdictLabel}</span>
    </div>
  );
}

export function DueloHeader({ d }: { d: DueloData }) {
  const v = duelVerdict(d.a, d.b);
  return (
    <section className="card cmp-hero" aria-labelledby="cmp-title">
      <p className="cmp-kicker">Cara a cara</p>
      <h1 id="cmp-title" className="cmp-headline">
        {headline(d.a, d.b)}
      </h1>
      <div className="cmp-vs">
        <Side fan={d.a} club={d.clubA} tag="a" />
        <span className="cmp-vs-badge" aria-hidden>
          VS
        </span>
        <Side fan={d.b} club={d.clubB} tag="b" />
      </div>
      <p className="cmp-verdict">
        <strong>{v.title}.</strong> {v.text}
      </p>
    </section>
  );
}

export function CaraACara({ d }: { d: DueloData }) {
  const rows = duelRows(d.a, d.b);
  const t = rowTally(rows);
  return (
    <section className="card cmp-table-card">
      <h2 className="section-title">Cara a cara</h2>
      <table className="cmp-table">
        <thead>
          <tr>
            <th scope="col">@{d.a.username}</th>
            <th scope="col" className="sr-only">
              Métrica
            </th>
            <th scope="col">@{d.b.username}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td className={r.winner === "a" ? "cmp-win" : undefined}>
                {r.winner === "a" && <span className="sr-only">Gana: </span>}
                {r.a}
              </td>
              <th scope="row" className="cmp-label">
                {r.label}
              </th>
              <td className={r.winner === "b" ? "cmp-win" : undefined}>
                {r.winner === "b" && <span className="sr-only">Gana: </span>}
                {r.b}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small" style={{ margin: "10px 0 0" }}>
        Métricas ganadas: @{d.a.username} {t.a} · @{d.b.username} {t.b}. En las filas sin marca no hay ganador. Solo por entretención.
      </p>
    </section>
  );
}

const MAX_COMMON = 8;

export function EnComun({ d }: { d: DueloData }) {
  const c = d.common;
  return (
    <section className="card">
      <h2 className="section-title">Partidos en común</h2>
      {c.count === 0 ? (
        <p className="muted">
          Todavía no coinciden en ningún partido. Cuando marquen el mismo, aparecerá aquí: «estuvimos en la misma noche».
        </p>
      ) : (
        <>
          <p>
            Estuvieron juntos en la galería en <strong>{c.count}</strong> {c.count === 1 ? "partido" : "partidos"}.
            {c.headToHead &&
              ` De esos, @${d.a.username} se fue feliz en ${c.headToHead.a}, @${d.b.username} en ${c.headToHead.b} y hubo ${c.headToHead.draws} ${c.headToHead.draws === 1 ? "empate" : "empates"}.`}
          </p>
          <div className="cmp-common-highlights">
            {c.sameClub && c.best && <CommonItem title="La mejor noche juntos" item={c.best.match} d={d} />}
            {c.sameClub && c.worst && <CommonItem title="La peor noche juntos" item={c.worst.match} d={d} />}
            {!c.sameClub && c.biggest && <CommonItem title="El partido más abultado" item={c.biggest.match} d={d} />}
          </div>
          <details className="cmp-common-list" open={c.count <= 3}>
            <summary>Ver {c.count === 1 ? "el partido" : `los ${Math.min(c.count, MAX_COMMON)} más recientes`}</summary>
            <div className="cmp-matches">
              {c.matches.slice(0, MAX_COMMON).map((x) => (
                <div key={x.match.id}>
                  <MatchRow match={x.match} goals={d.goals.get(x.match.id)} />
                </div>
              ))}
            </div>
            {c.count > MAX_COMMON && <p className="muted small">…y {c.count - MAX_COMMON} más.</p>}
          </details>
        </>
      )}
    </section>
  );
}

function CommonItem({ title, item: m, d }: { title: string; item: DueloData["common"]["matches"][number]["match"]; d: DueloData }) {
  const goals = d.goals.get(m.id) ?? [];
  const home = scorersLine(goals, m.homeTeamId);
  const away = scorersLine(goals, m.awayTeamId);
  return (
    <div className="cmp-common-item">
      <span className="cmp-kicker">{title}</span>
      <strong>
        {m.homeTeamName} {scoreLine(m)} {m.awayTeamName}
      </strong>
      <span className="muted small">
        {formatDate(m.date)} · {m.competitionName}
      </span>
      {(home || away) && (
        <span className="muted small">
          {[home && `${m.homeTeamName}: ${home}`, away && `${m.awayTeamName}: ${away}`].filter(Boolean).join(" · ")}
        </span>
      )}
    </div>
  );
}

function Pair({ label, name, goals }: { label: string; name: string | null; goals: number | null }) {
  return (
    <div className="cmp-pair">
      <span className="cmp-kicker">{label}</span>
      {name ? (
        <strong>
          {name} <span className="muted">· {goals} {goals === 1 ? "gol" : "goles"}</span>
        </strong>
      ) : (
        <span className="muted">Sin datos de goleadores</span>
      )}
    </div>
  );
}

export function IdolosVerdugos({ d }: { d: DueloData }) {
  const col = (fan: FanSide, s: ScorersReport) => (
    <div className="cmp-idols-col">
      <h3 className="cmp-sub">@{fan.username}</h3>
      <Pair label="Ídolo" name={s.idols[0]?.player ?? null} goals={s.idols[0]?.goals ?? null} />
      <Pair label="Verdugo" name={s.executioners[0]?.player ?? null} goals={s.executioners[0]?.goals ?? null} />
    </div>
  );
  return (
    <section className="card">
      <h2 className="section-title">Ídolos y verdugos</h2>
      <div className="cmp-idols">
        {col(d.a, d.scorersA)}
        {col(d.b, d.scorersB)}
      </div>
    </section>
  );
}
