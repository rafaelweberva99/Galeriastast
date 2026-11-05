"use client";
import type { SeasonInsight } from "@/lib/domain/insights/types.ts";
import { pct01, signed, zoneOf, zoneVar } from "../helpers.ts";
import { useWidth } from "./useWidth.ts";

const ROW = 38;
const LABEL = 44;
const RIGHT = 84;
const TOP = 18;

/** Una fila por temporada: tu efectividad (barra) contra la del club ese año (marca) y la diferencia en puntos. */
export function SeasonBars({ seasons }: { seasons: SeasonInsight[] }) {
  const { ref, w } = useWidth();
  if (!seasons.length) return <p className="muted cv-empty">Aún no hay temporadas con partidos marcados.</p>;
  const rows = [...seasons].sort((a, b) => b.season - a.season);
  const bw = w - LABEL - RIGHT;
  const H = TOP + rows.length * ROW + 4;
  return (
    <div className="cv-chart" ref={ref}>
      <svg width={w} height={H} role="img" aria-label="Efectividad por temporada comparada con la del club" className="cv-svg">
        {[0.4, 0.6].map((v) => (
          <g key={v}>
            <line x1={LABEL + v * bw} x2={LABEL + v * bw} y1={TOP - 4} y2={H - 4} className="cv-ref" />
            <text x={LABEL + v * bw} y={10} textAnchor="middle" className="cv-axis">
              {v * 100}%
            </text>
          </g>
        ))}
        {rows.map((s, i) => {
          const top = TOP + i * ROW;
          const mid = top + ROW / 2;
          const thin = s.pj < 3;
          const label = `${s.season}: ${s.pj} ${s.pj === 1 ? "partido" : "partidos"}, ${s.g} ganados, ${s.e} empatados, ${s.p} perdidos, efectividad ${pct01(s.effectiveness)}${
            s.clubEffectiveness !== null ? `; el club ese año ${pct01(s.clubEffectiveness)}` : ""
          }`;
          return (
            <g key={s.season} opacity={thin ? 0.6 : 1}>
              <title>{label}</title>
              <text x={0} y={mid - 1} className="cv-rowlabel">
                {s.season}
              </text>
              <text x={0} y={mid + 12} className="cv-axis">
                {s.pj} PJ
              </text>
              <rect x={LABEL} y={mid - 6} width={bw} height={12} rx={6} className="cv-track" />
              <rect x={LABEL} y={mid - 6} width={Math.max(4, s.effectiveness * bw)} height={12} rx={6} fill={zoneVar(zoneOf(s.effectiveness))} />
              {s.clubEffectiveness !== null && (
                <rect x={LABEL + s.clubEffectiveness * bw - 1.5} y={mid - 11} width={3} height={22} rx={1.5} className="cv-club-mark" />
              )}
              <text x={w - RIGHT + 8} y={mid + 5} className="cv-value">
                {pct01(s.effectiveness)}
              </text>
              {s.delta !== null && (
                <text x={w} y={mid + 5} textAnchor="end" className={`cv-delta ${s.delta >= 0 ? "up" : "down"}`}>
                  {signed(s.delta)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="cv-legend">
        <span>
          <i className="cv-key cv-key-club" /> Efectividad del club ese año
        </span>
        <span className="muted">Cifra de la derecha: tu diferencia en puntos</span>
      </div>
    </div>
  );
}
