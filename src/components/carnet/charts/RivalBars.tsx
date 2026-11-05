"use client";
import { useState } from "react";
import type { RivalInsight } from "@/lib/domain/insights/types.ts";
import { pct01, zoneOf, zoneVar } from "../helpers.ts";
import { useWidth } from "./useWidth.ts";

const ROW = 52;
const RIGHT = 74;

type Sort = "pj" | "cabala" | "yeta";
const SORTS: { key: Sort; label: string }[] = [
  { key: "pj", label: "Más vistos" },
  { key: "cabala", label: "Cábalas" },
  { key: "yeta", label: "Yetas" },
];
const MARK = { cabala: "★ Cábala", yeta: "▼ Yeta", neutro: "Neutro", "poca-muestra": "Poca muestra" } as const;

/** Barras por rival con la efectividad cuando fuiste, la marca de la efectividad histórica del club y el veredicto en texto. */
export function RivalBars({ rivals, initial = 8 }: { rivals: RivalInsight[]; initial?: number }) {
  const { ref, w } = useWidth();
  const [sort, setSort] = useState<Sort>("pj");
  const [all, setAll] = useState(false);
  if (!rivals.length) return <p className="muted cv-empty">Cuando marques partidos aparecerán aquí tus rivales.</p>;

  const eligible = sort === "pj" ? rivals : rivals.filter((r) => r.pj >= 3);
  const sorted = [...eligible].sort((a, b) =>
    sort === "pj" ? b.pj - a.pj || b.effectiveness - a.effectiveness : sort === "cabala" ? b.effectiveness - a.effectiveness || b.pj - a.pj : a.effectiveness - b.effectiveness || b.pj - a.pj,
  );
  const visible = all ? sorted : sorted.slice(0, initial);
  const bw = w - RIGHT;
  const H = visible.length * ROW;
  return (
    <div className="cv-chart" ref={ref}>
      <div className="cv-seg" role="group" aria-label="Ordenar rivales">
        {SORTS.map((s) => (
          <button key={s.key} type="button" aria-pressed={sort === s.key} onClick={() => setSort(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      {sort !== "pj" && <p className="muted small cv-note">Solo rivales que viste 3 veces o más.</p>}
      {visible.length === 0 ? (
        <p className="muted cv-empty">Todavía ningún rival llega a 3 partidos vistos.</p>
      ) : (
        <svg width={w} height={H} role="img" aria-label="Efectividad por rival" className="cv-svg">
          {[0.4, 0.6].map((v) => (
            <line key={v} x1={v * bw} x2={v * bw} y1={0} y2={H} className="cv-ref" />
          ))}
          {visible.map((r, i) => {
            const top = i * ROW;
            const z = r.verdict === "poca-muestra" ? null : zoneOf(r.effectiveness);
            return (
              <g key={r.rivalId} opacity={r.verdict === "poca-muestra" ? 0.65 : 1}>
                <title>{`${r.rivalName}: ${r.pj} partidos, ${r.g} ganados, ${r.e} empatados, ${r.p} perdidos, efectividad ${pct01(r.effectiveness)}${
                  r.clubEffectiveness !== null ? `; historial del club contra este rival ${pct01(r.clubEffectiveness)}` : ""
                }`}</title>
                <text x={0} y={top + 16} className="cv-rowlabel">
                  {r.rivalName}
                </text>
                <text x={w} y={top + 16} textAnchor="end" className="cv-value">
                  {pct01(r.effectiveness)}
                </text>
                <text x={0} y={top + 44} className="cv-axis">
                  {r.pj} PJ · {r.g}-{r.e}-{r.p}
                </text>
                <rect x={0} y={top + 25} width={bw} height={10} rx={5} className="cv-track" />
                <rect x={0} y={top + 25} width={Math.max(4, r.effectiveness * bw)} height={10} rx={5} fill={z ? zoneVar(z) : "var(--muted)"} />
                {r.clubEffectiveness !== null && <rect x={r.clubEffectiveness * bw - 1.5} y={top + 21} width={3} height={18} rx={1.5} className="cv-club-mark" />}
                <text x={w} y={top + 36} textAnchor="end" className={`cv-verdict ${r.verdict}`}>
                  {MARK[r.verdict]}
                </text>
              </g>
            );
          })}
        </svg>
      )}
      <div className="cv-legend">
        <span>
          <i className="cv-key cv-key-club" /> Historial del club contra ese rival
        </span>
      </div>
      {sorted.length > initial && (
        <button type="button" className="btn btn-ghost cv-more" onClick={() => setAll((v) => !v)}>
          {all ? "Ver menos" : `Ver los ${sorted.length} rivales`}
        </button>
      )}
    </div>
  );
}
