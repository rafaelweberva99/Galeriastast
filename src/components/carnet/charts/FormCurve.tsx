"use client";
import { useState } from "react";
import type { FormPoint } from "@/lib/domain/insights/types.ts";
import { formatDate } from "../../format.ts";
import { pct01, spacedLabels } from "../helpers.ts";
import { useWidth } from "./useWidth.ts";

const H = 236;
const M = { t: 12, r: 40, b: 26, l: 34 };

/** Curva de forma: efectividad acumulada y móvil de 10 partidos, con las zonas yeta (<40 %) y cábala (>60 %). */
export function FormCurve({ points }: { points: FormPoint[] }) {
  const { ref, w } = useWidth();
  const [active, setActive] = useState<number | null>(null);
  const n = points.length;
  if (n < 2) return <p className="muted cv-empty">Con dos partidos marcados ya se dibuja tu curva de forma.</p>;

  const iw = w - M.l - M.r;
  const ih = H - M.t - M.b;
  const x = (i: number) => M.l + (i / (n - 1)) * iw;
  const y = (v: number) => M.t + (1 - v) * ih;
  const line = (get: (p: FormPoint) => number | null) => {
    let d = "";
    let pen = false;
    points.forEach((p, i) => {
      const v = get(p);
      if (v === null) return;
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };
  const years = spacedLabels(
    points.flatMap((p, i) => (i === 0 || p.date.slice(0, 4) !== points[i - 1].date.slice(0, 4) ? [{ x: x(i), text: p.date.slice(0, 4) }] : [])),
    38,
  );
  const shown = points[active ?? n - 1];
  const last = points[n - 1];
  const move = (clientX: number, rect: DOMRect) => {
    const i = Math.round(((clientX - rect.left - M.l) / iw) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  };

  return (
    <div className="cv-chart" ref={ref}>
      <div className="cv-readout" aria-live="polite">
        <span className="cv-readout-match">
          {formatDate(shown.date)} · {shown.label}
        </span>
        <span className="cv-readout-nums">
          <b>{pct01(shown.cumulative)}</b> acumulada
          {shown.rolling10 !== null && (
            <>
              {" · "}
              <b>{pct01(shown.rolling10)}</b> últimos 10
            </>
          )}
        </span>
      </div>
      <svg
        width={w}
        height={H}
        role="group"
        aria-label={`Curva de forma de ${n} partidos. Efectividad acumulada final ${pct01(last.cumulative)}. Usa las flechas para recorrerla.`}
        tabIndex={0}
        className="cv-svg cv-scrub"
        onPointerMove={(e) => move(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => move(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            setActive((a) => Math.min(n - 1, Math.max(0, (a ?? n - 1) + (e.key === "ArrowRight" ? 1 : -1))));
          } else if (e.key === "Home") setActive(0);
          else if (e.key === "End") setActive(n - 1);
        }}
      >
        <title>Curva de forma</title>
        <rect x={M.l} y={y(1)} width={iw} height={y(0.6) - y(1)} fill="var(--win)" opacity={0.1} />
        <rect x={M.l} y={y(0.6)} width={iw} height={y(0.4) - y(0.6)} fill="var(--draw)" opacity={0.1} />
        <rect x={M.l} y={y(0.4)} width={iw} height={y(0) - y(0.4)} fill="var(--loss)" opacity={0.1} />
        {[0, 0.4, 0.6, 1].map((v) => (
          <g key={v}>
            <line x1={M.l} x2={M.l + iw} y1={y(v)} y2={y(v)} className={v === 0.4 || v === 0.6 ? "cv-ref" : "cv-grid"} />
            <text x={M.l - 6} y={y(v) + 4} textAnchor="end" className="cv-axis">
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}
        {years.map((l) => (
          <text key={l.text} x={l.x} y={H - 6} textAnchor="middle" className="cv-axis">
            {l.text}
          </text>
        ))}
        <path d={line((p) => p.rolling10)} className="cv-line-roll" fill="none" />
        <path d={line((p) => p.cumulative)} className="cv-line-main" fill="none" />
        {active === null ? (
          <>
            <circle cx={x(n - 1)} cy={y(last.cumulative)} r={4.5} className="cv-dot" />
            <text x={x(n - 1) + 8} y={y(last.cumulative) + 4} className="cv-endlabel">
              {pct01(last.cumulative)}
            </text>
          </>
        ) : (
          <>
            <line x1={x(active)} x2={x(active)} y1={M.t} y2={M.t + ih} className="cv-cursor" />
            <circle cx={x(active)} cy={y(shown.cumulative)} r={5} className="cv-dot" />
            {shown.rolling10 !== null && <circle cx={x(active)} cy={y(shown.rolling10)} r={4} className="cv-dot-roll" />}
          </>
        )}
      </svg>
      <div className="cv-legend">
        <span>
          <i className="cv-key cv-key-main" /> Acumulada
        </span>
        <span>
          <i className="cv-key cv-key-roll" /> Últimos 10 partidos
        </span>
        <span className="muted">Sobre 60 % = cábala · bajo 40 % = yeta</span>
      </div>
    </div>
  );
}
