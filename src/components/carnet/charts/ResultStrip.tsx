"use client";
import type { FormPoint } from "@/lib/domain/insights/types.ts";
import { formatDate } from "../../format.ts";
import { OUTCOME_ZONE } from "../helpers.ts";
import { useWidth } from "./useWidth.ts";

const SQ = 22;
const GAP = 4;
const YEAR_W = 40;

const NAME = { G: "Ganado", E: "Empate", P: "Perdido" } as const;

/** Tira de resultados cronológicos (cuadraditos G/E/P). Con `bySeason` los agrupa por año, uno por fila (envolviendo). */
export function ResultStrip({ points, bySeason = false, last }: { points: FormPoint[]; bySeason?: boolean; last?: number }) {
  const { ref, w } = useWidth();
  const list = last ? points.slice(-last) : points;
  if (!list.length) return <p className="muted cv-empty">Aún no hay resultados que mostrar.</p>;

  type Cell = { p: FormPoint; x: number; y: number };
  const cells: Cell[] = [];
  const years: { year: string; y: number }[] = [];
  const offset = bySeason ? YEAR_W : 0;
  const perRow = Math.max(1, Math.floor((w - offset + GAP) / (SQ + GAP)));
  let row = 0;
  let col = 0;
  let prevYear = "";
  list.forEach((p) => {
    const year = p.date.slice(0, 4);
    if (bySeason && year !== prevYear) {
      if (prevYear) row++;
      col = 0;
      years.push({ year, y: row * (SQ + GAP) });
    } else if (col >= perRow) {
      row++;
      col = 0;
    }
    cells.push({ p, x: offset + col * (SQ + GAP), y: row * (SQ + GAP) });
    col++;
    prevYear = year;
  });
  const H = (row + 1) * (SQ + GAP) - GAP;
  const g = list.filter((p) => p.outcome === "G").length;
  const e = list.filter((p) => p.outcome === "E").length;
  return (
    <div className="cv-chart" ref={ref}>
      <svg width={w} height={H} role="img" aria-label={`Resultados en orden: ${g} ganados, ${e} empatados, ${list.length - g - e} perdidos`} className="cv-svg">
        {years.map((yr) => (
          <text key={yr.year} x={0} y={yr.y + SQ / 2 + 4} className="cv-rowlabel">
            {yr.year}
          </text>
        ))}
        {cells.map(({ p, x, y }) => (
          <g key={p.matchId}>
            <title>{`${formatDate(p.date)} · ${p.label} · ${NAME[p.outcome]}`}</title>
            <rect x={x} y={y} width={SQ} height={SQ} rx={5} className={`cv-sq ${OUTCOME_ZONE[p.outcome]}`} />
            <text x={x + SQ / 2} y={y + SQ / 2 + 4.5} textAnchor="middle" className={`cv-sq-text ${OUTCOME_ZONE[p.outcome]}`}>
              {p.outcome}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
