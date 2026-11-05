"use client";

import { useEffect, useRef } from "react";
import { CountUp } from "./CountUp.tsx";

/** Maqueta ilustrativa del carnet para la portada: datos de ejemplo, no de un hincha real. */
const BARS = [38, 52, 61, 44, 70, 66, 58, 74, 49, 63, 81];
const FORM = ["w", "w", "d", "l", "w", "w", "w", "l", "d", "w"];

function Gauge() {
  const r = 70, cx = 90, cy = 86;
  const pt = (p: number) => {
    const a = Math.PI * (1 - p / 100);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
  };
  const arc = (a: number, b: number) => {
    const [x1, y1] = pt(a), [x2, y2] = pt(b);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const [nx, ny] = pt(68);
  return (
    <svg viewBox="0 0 180 112" className="lp-gauge" aria-hidden="true">
      <path d={arc(0, 40)} stroke="var(--loss)" strokeWidth="13" fill="none" />
      <path d={arc(40, 60)} stroke="var(--draw)" strokeWidth="13" fill="none" />
      <path d={arc(60, 100)} stroke="var(--win)" strokeWidth="13" fill="none" />
      <g className="lp-needle">
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#121a15" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r="6" fill="#121a15" />
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="var(--font-display), sans-serif" fill="#121a15">68%</text>
    </svg>
  );
}

export function LandingPreview() {
  const tilt = useRef<HTMLDivElement>(null);

  // Inclinación 3D leve que sigue al mouse sobre toda la cancha (solo punteros con hover y sin "reducir movimiento").
  useEffect(() => {
    const el = tilt.current;
    const hero = el?.closest<HTMLElement>(".hero");
    if (!el || !hero || !window.matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${(-y * 10).toFixed(2)}deg`);
      });
    };
    const leave = () => {
      el.style.removeProperty("--ry");
      el.style.removeProperty("--rx");
    };
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className="lp" aria-label="Ejemplo de carnet de hincha">
      <span className="lp-tag">Ejemplo</span>
      <div className="lp-float">
      <div className="lp-tilt" ref={tilt}>
      <div className="lp-card">
        <div className="lp-head">
          <div>
            <p className="lp-kicker">Carnet de hincha · Oro</p>
            <p className="lp-name">Nacho Bulla</p>
            <p className="lp-sub">74 partidos · 2011–2026</p>
          </div>
          <span className="lp-medal">ORO</span>
        </div>
        <div className="lp-body">
          <div className="lp-gauge-box">
            <Gauge />
            <p className="lp-verdict">¡Eres cábala!</p>
          </div>
          <div className="lp-kpis">
            <div><b><CountUp value={39} duration={1100} /></b><span>ganados</span></div>
            <div><b><CountUp value={18} duration={1100} /></b><span>empates</span></div>
            <div><b><CountUp value={17} duration={1100} /></b><span>perdidos</span></div>
          </div>
        </div>
        <div className="lp-form" aria-hidden="true">
          {FORM.map((f, i) => <i key={i} className={`lp-${f}`} style={{ "--i": i } as React.CSSProperties} />)}
        </div>
        <div className="lp-bars" aria-hidden="true">
          {BARS.map((h, i) => <i key={i} style={{ height: `${h}%`, "--i": i } as React.CSSProperties} />)}
        </div>
        <p className="lp-cap">Efectividad por temporada</p>
        <div className="lp-rows">
          <div><span>Ídolo de galería</span><b>M. Pinilla · 9 goles</b></div>
          <div><span>Tu verdugo</span><b>F. Zampedri · 3 goles</b></div>
          <div><span>Clásico favorito</span><b>vs Colo-Colo · 61%</b></div>
        </div>
      </div>
      </div>
      </div>
    </div>
  );
}
