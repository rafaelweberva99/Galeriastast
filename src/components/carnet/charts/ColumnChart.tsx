"use client";
import { argMax } from "../helpers.ts";
import { useWidth } from "./useWidth.ts";

const H = 150;
const M = { t: 18, b: 22 };

/** Columnas simples (mes del año, día de la semana). La más alta va con el color del club; todas llevan su cifra. */
export function ColumnChart({ values, labels, titles, aria }: { values: number[]; labels: string[]; titles: string[]; aria: string }) {
  const { ref, w } = useWidth();
  const max = Math.max(...values, 1);
  const top = argMax(values);
  const slot = w / values.length;
  const bar = Math.min(32, slot * 0.66);
  const ih = H - M.t - M.b;
  return (
    <div className="cv-chart" ref={ref}>
      <svg width={w} height={H} role="img" aria-label={aria} className="cv-svg">
        <line x1={0} x2={w} y1={H - M.b} y2={H - M.b} className="cv-grid" />
        {values.map((v, i) => {
          const h = v === 0 ? 0 : Math.max(3, (v / max) * ih);
          const cx = slot * i + slot / 2;
          return (
            <g key={i}>
              <title>{`${titles[i]}: ${v} ${v === 1 ? "partido" : "partidos"}`}</title>
              <rect x={cx - bar / 2} y={H - M.b - h} width={bar} height={h} rx={4} className={i === top ? "cv-col top" : "cv-col"} />
              {v > 0 && (
                <text x={cx} y={H - M.b - h - 5} textAnchor="middle" className={i === top ? "cv-value-sm top" : "cv-value-sm"}>
                  {v}
                </text>
              )}
              <text x={cx} y={H - 6} textAnchor="middle" className="cv-axis">
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
