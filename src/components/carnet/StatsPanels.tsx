import type { Carnet } from "@/lib/domain/stats.ts";
import type { AttendedMatch } from "@/lib/domain/types.ts";
import type { Insights, StreakInfo } from "@/lib/domain/insights/types.ts";
import { effectiveness } from "@/lib/domain/stats.ts";
import { formatDate, scoreLine } from "../format.ts";
import { pct01, signed, MONTHS_LETTER, MONTHS_SHORT, WEEKDAYS_FULL, WEEKDAYS_SHORT } from "./helpers.ts";

const PHASE_LABEL = { liga: "Liga", grupos: "Fase de grupos", eliminatoria: "Eliminatorias", final: "Finales", otro: "Otros" } as const;

export const eff01 = (r: Parameters<typeof effectiveness>[0]) => {
  const e = effectiveness(r);
  return e === null ? null : e / 100;
};

function Tile({ value, label, sub, tone }: { value: string; label: string; sub?: string; tone?: "win" | "loss" }) {
  return (
    <div className="cv-tile">
      <div className={`cv-tile-v ${tone ?? ""}`}>{value}</div>
      <div className="cv-tile-l">{label}</div>
      {sub && <div className="cv-tile-s">{sub}</div>}
    </div>
  );
}

const span = (s: StreakInfo | null) => (s ? `${formatDate(s.from)} al ${formatDate(s.to)}` : undefined);

/** Rachas y récords. Las rachas "actual" y más largas vienen del carnet; las fechas y temporadas, de los insights. */
export function RecordsPanel({ carnet: c, insights: i }: { carnet: Carnet; insights: Insights }) {
  const r = i.records;
  return (
    <div className="cv-tiles">
      <Tile value={String(c.streaks.longestWin)} label="racha ganando" sub={span(r.longestWin)} />
      <Tile value={String(c.streaks.longestUnbeaten)} label="racha invicto" sub={span(r.longestUnbeaten)} />
      <Tile value={String(c.streaks.longestWinless)} label="racha sin ganar" sub={span(r.longestWinless)} />
      <Tile value={c.streaks.current ? `${c.streaks.current.length} ${c.streaks.current.outcome}` : "—"} label="racha actual" />
      <Tile value={String(r.seasonsInARow)} label={r.seasonsInARow === 1 ? "temporada seguida" : "temporadas seguidas"} sub="yendo al estadio" />
      {r.bestSeason && <Tile value={String(r.bestSeason.season)} label="tu mejor año" sub={`${pct01(r.bestSeason.effectiveness)} en ${r.bestSeason.pj} PJ`} tone="win" />}
      {r.worstSeason && <Tile value={String(r.worstSeason.season)} label="tu peor año" sub={`${pct01(r.worstSeason.effectiveness)} en ${r.worstSeason.pj} PJ`} tone="loss" />}
      {r.busiestSeason && <Tile value={String(r.busiestSeason.season)} label="tu año más estadio" sub={`${r.busiestSeason.pj} partidos`} />}
    </div>
  );
}

export function GoalsPanel({ insights: i }: { insights: Insights }) {
  const g = i.goals;
  const fmt = (n: number) => n.toFixed(1).replace(".", ",");
  return (
    <>
      <div className="cv-tiles">
        <Tile value={fmt(g.forPerMatch)} label="goles a favor por partido" />
        <Tile value={fmt(g.againstPerMatch)} label="goles en contra por partido" />
        <Tile value={String(g.cleanSheets)} label="vallas invictas" sub={`de ${i.played} partidos`} />
        <Tile value={String(g.bigWins)} label="goleadas a favor" sub="por 3 o más" tone="win" />
        <Tile value={String(g.bigLosses)} label="goleadas en contra" sub="por 3 o más" tone={g.bigLosses ? "loss" : undefined} />
        <Tile value={String(g.goalless)} label="partidos 0-0" />
        {g.shootouts.pj > 0 && <Tile value={`${g.shootouts.won}-${g.shootouts.lost}`} label="en penales" sub={`${g.shootouts.pj} definiciones`} />}
      </div>
      {g.highestScoring && (
        <p className="cv-note-line">
          <span className="muted">El partido con más goles que viste: </span>
          <strong>
            {g.highestScoring.homeTeamName} {scoreLine(g.highestScoring)} {g.highestScoring.awayTeamName}
          </strong>
          <span className="muted"> · {formatDate(g.highestScoring.date)}</span>
        </p>
      )}
    </>
  );
}

/** "Contigo y sin ti": cómo le va al club en los partidos de esas mismas temporadas a los que no fuiste. */
export function MissedPanel({ insights: i, owner }: { insights: Insights; owner: boolean }) {
  const m = i.missed;
  if (!m || m.missed === 0) return <p className="muted cv-empty">Aún no hay partidos de tu club en tus temporadas a los que no hayas ido para comparar.</p>;
  const diff = (m.withYou.effectiveness - m.without.effectiveness) * 100;
  const verdict =
    Math.abs(diff) < 3
      ? `Da casi lo mismo si ${owner ? "vas" : "va"} o no: ${signed(diff, 1)} puntos.`
      : diff > 0
        ? `El club rinde ${signed(diff)} puntos más cuando ${owner ? "estás" : "está"} en la galería.`
        : `El club rinde ${Math.abs(Math.round(diff))} puntos más cuando ${owner ? "no estás" : "no está"}. Mejor no lo comentes en el camarín.`;
  return (
    <>
      <div className="cv-vs">
        <div className="cv-vs-col">
          <div className="cv-vs-v">{pct01(m.withYou.effectiveness)}</div>
          <div className="cv-vs-l">{owner ? "cuando fuiste" : "cuando fue"}</div>
          <div className="cv-vs-s">{m.withYou.pj} partidos</div>
        </div>
        <div className="cv-vs-sep" aria-hidden>
          vs
        </div>
        <div className="cv-vs-col">
          <div className="cv-vs-v">{pct01(m.without.effectiveness)}</div>
          <div className="cv-vs-l">{owner ? "cuando no fuiste" : "cuando no fue"}</div>
          <div className="cv-vs-s">{m.without.pj} partidos</div>
        </div>
      </div>
      <p className="cv-note-line">{verdict}</p>
      {(m.biggestWinMissed || m.biggestLossMissed) && (
        <ul className="cv-missed-list">
          {m.biggestWinMissed && (
            <li>
              <span className="muted">La mayor alegría que {owner ? "te perdiste" : "se perdió"}: </span>
              {m.biggestWinMissed.homeTeamName} {scoreLine(m.biggestWinMissed)} {m.biggestWinMissed.awayTeamName}
              <span className="muted"> ({formatDate(m.biggestWinMissed.date)})</span>
            </li>
          )}
          {m.biggestLossMissed && (
            <li>
              <span className="muted">El mal rato que {owner ? "te ahorraste" : "se ahorró"}: </span>
              {m.biggestLossMissed.homeTeamName} {scoreLine(m.biggestLossMissed)} {m.biggestLossMissed.awayTeamName}
              <span className="muted"> ({formatDate(m.biggestLossMissed.date)})</span>
            </li>
          )}
        </ul>
      )}
    </>
  );
}

export function Memorable({ title, match }: { title: string; match: AttendedMatch | null }) {
  return (
    <div className="cv-memo">
      <div className="cv-memo-t">{title}</div>
      {match ? (
        <>
          <div className="cv-memo-m">
            {match.homeTeamName} <span className="cv-memo-score">{scoreLine(match)}</span> {match.awayTeamName}
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

export { PHASE_LABEL, MONTHS_LETTER, MONTHS_SHORT, WEEKDAYS_FULL, WEEKDAYS_SHORT };
