"use client";
import { pct01 } from "../helpers.ts";
import { useWidth } from "./useWidth.ts";

export interface RecordRow {
  label: string;
  /** Texto chico bajo el nombre (p. ej. "61 PJ"). */
  sub?: string;
  g: number;
  e: number;
  p: number;
  /** Efectividad 0 a 1 (null = sin datos). */
  eff: number | null;
}

const ROW = 50;
const RIGHT = 48;

/** Barras apiladas G-E-P (con las cifras dentro) para local/visita, competiciones o fases. */
export function RecordRows({ rows, aria }: { rows: RecordRow[]; aria: string }) {
  const { ref, w } = useWidth();
  const visible = rows.filter((r) => r.g + r.e + r.p > 0);
  if (!visible.length) return <p className="muted cv-empty">Sin partidos todavía.</p>;
  const bw = w - RIGHT;
  return (
    <div className="cv-chart" ref={ref}>
      <svg width={w} height={visible.length * ROW} role="img" aria-label={aria} className="cv-svg">
        {visible.map((r, i) => {
          const top = i * ROW;
          const pj = r.g + r.e + r.p;
          let x = 0;
          const segs = ([
            ["win", r.g, "G"],
            ["draw", r.e, "E"],
            ["loss", r.p, "P"],
          ] as const).map(([z, n, k]) => {
            const sw = (n / pj) * bw;
            const seg = { z, n, k, x, sw };
            x += sw;
            return seg;
          });
          return (
            <g key={r.label}>
              <title>{`${r.label}: ${pj} partidos, ${r.g} ganados, ${r.e} empatados, ${r.p} perdidos${r.eff !== null ? `, efectividad ${pct01(r.eff)}` : ""}`}</title>
              <text x={0} y={top + 14} className="cv-rowlabel">
                {r.label}
                {r.sub && <tspan className="cv-axis"> · {r.sub}</tspan>}
              </text>
              <text x={w} y={top + 14} textAnchor="end" className="cv-value">
                {pct01(r.eff)}
              </text>
              <clipPath id={`rr-${i}-${w}`}>
                <rect x={0} y={top + 22} width={bw} height={22} rx={6} />
              </clipPath>
              <g clipPath={`url(#rr-${i}-${w})`}>
                {segs.map((s) =>
                  s.n > 0 ? (
                    <g key={s.k}>
                      <rect x={s.x} y={top + 22} width={s.sw} height={22} className={`cv-seg-fill ${s.z}`} />
                      {s.sw >= 18 && (
                        <text x={s.x + s.sw / 2} y={top + 37} textAnchor="middle" className={`cv-seg-text ${s.z}`}>
                          {s.n}
                        </text>
                      )}
                    </g>
                  ) : null,
                )}
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
