"use client";

import { useEffect, useRef, useState } from "react";
import { CountUp } from "./CountUp.tsx";

/** Carnets de muestra que rotan en la portada. Los hinchas y las cifras son ilustrativos; los goleadores son reales de cada club. */
export interface PreviewClub { id: string; primary: string; secondary: string; svg: string }
interface Demo {
  club: string; fan: string; tier: "Oro" | "Plata" | "Bronce"; pct: number; w: number; d: number; l: number;
  games: string; idol: string; foe: string; rival: string; rivalPct: number; seed: number;
}
const DEMOS: Demo[] = [
  { club: "universidad-de-chile", fan: "Nacho Bulla", tier: "Oro", pct: 68, w: 39, d: 18, l: 17, games: "74 partidos · 2011–2026", idol: "M. Pinilla · 9 goles", foe: "F. Zampedri · 3 goles", rival: "vs Colo-Colo", rivalPct: 61, seed: 3 },
  { club: "colo-colo", fan: "Pancho Albo", tier: "Plata", pct: 57, w: 24, d: 14, l: 12, games: "50 partidos · 2014–2026", idol: "E. Paredes · 14 goles", foe: "M. Pinilla · 4 goles", rival: "vs U. de Chile", rivalPct: 55, seed: 7 },
  { club: "universidad-catolica", fan: "Cata Cruzada", tier: "Oro", pct: 72, w: 41, d: 15, l: 14, games: "70 partidos · 2010–2026", idol: "F. Zampedri · 12 goles", foe: "E. Paredes · 5 goles", rival: "vs Colo-Colo", rivalPct: 66, seed: 11 },
  { club: "ohiggins", fan: "Rodri Celeste", tier: "Bronce", pct: 52, w: 14, d: 9, l: 10, games: "33 partidos · 2017–2026", idol: "P. Calandria · 8 goles", foe: "E. Paredes · 3 goles", rival: "vs Everton", rivalPct: 60, seed: 5 },
  { club: "palestino", fan: "Tito Árabe", tier: "Plata", pct: 48, w: 18, d: 13, l: 17, games: "48 partidos · 2012–2026", idol: "B. Carrasco · 7 goles", foe: "F. Zampedri · 3 goles", rival: "vs Audax", rivalPct: 63, seed: 9 },
  { club: "huachipato", fan: "Lucho Acero", tier: "Plata", pct: 61, w: 22, d: 10, l: 10, games: "42 partidos · 2013–2026", idol: "C. Martínez · 6 goles", foe: "E. Paredes · 4 goles", rival: "vs U. de Concepción", rivalPct: 70, seed: 2 },
  { club: "coquimbo-unido", fan: "Vale Pirata", tier: "Bronce", pct: 44, w: 9, d: 8, l: 13, games: "30 partidos · 2018–2026", idol: "M. Corrales · 7 goles", foe: "E. Paredes · 3 goles", rival: "vs Cobresal", rivalPct: 58, seed: 13 },
];
const ROTATE_MS = 6500;

/** Color de las barras: el del club, salvo que sea casi negro (queda feo) → gris pizarra. */
function barColor(hex: string | undefined) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? "");
  if (!m) return "#2f9e5f";
  const n = parseInt(m[1], 16);
  const lum = (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
  return lum < 0.2 ? "#4b5563" : `#${m[1]}`;
}

/** Barras y racha deterministas a partir de la semilla (para que cada carnet se vea distinto). */
function series(seed: number, pct: number) {
  const bars = Array.from({ length: 11 }, (_, i) => Math.max(18, Math.min(92, Math.round(pct + 22 * Math.sin(seed * 1.7 + i * 1.3) + (i - 5) * 1.2))));
  const form = Array.from({ length: 10 }, (_, i) => {
    const v = (Math.sin(seed * 3.1 + i * 2.3) + 1) / 2 * 100;
    return v < pct * 0.8 ? "w" : v < pct * 0.8 + 18 ? "d" : "l";
  });
  return { bars, form };
}

function Gauge({ pct }: { pct: number }) {
  const r = 70, cx = 90, cy = 86;
  const pt = (p: number) => {
    const a = Math.PI * (1 - p / 100);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
  };
  const arc = (a: number, b: number) => {
    const [x1, y1] = pt(a), [x2, y2] = pt(b);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const [nx, ny] = pt(pct);
  return (
    <svg viewBox="0 0 180 112" className="lp-gauge" aria-hidden="true">
      <path d={arc(0, 40)} stroke="var(--loss)" strokeWidth="13" fill="none" />
      <path d={arc(40, 60)} stroke="var(--draw)" strokeWidth="13" fill="none" />
      <path d={arc(60, 100)} stroke="var(--win)" strokeWidth="13" fill="none" />
      <g className="lp-needle">
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#121a15" strokeWidth="4" strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r="6" fill="#121a15" />
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="var(--font-display), sans-serif" fill="#121a15">{pct}%</text>
    </svg>
  );
}

export function LandingPreview({ clubs }: { clubs: PreviewClub[] }) {
  const tilt = useRef<HTMLDivElement>(null);
  const shown = DEMOS.filter((d) => clubs.some((c) => c.id === d.club));
  const list = shown.length ? shown : DEMOS;
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [list.length]);
  const d = list[idx % list.length];
  const club = clubs.find((c) => c.id === d.club);
  const { bars, form } = series(d.seed, d.pct);
  const verdict = d.pct >= 60 ? "¡Eres cábala!" : d.pct >= 40 ? "Hincha neutro" : "Eres yeta";

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
    <div className="lp" aria-label="Carnet de hincha de muestra">
      <div className="lp-float">
        <div className="lp-tilt" ref={tilt}>
          <div className="lp-card" key={d.club} style={{ "--lp-c1": barColor(club?.primary), "--lp-c2": club?.secondary ?? "#fff" } as React.CSSProperties}>
            <div className="lp-head">
              {club && <span className="lp-jersey" dangerouslySetInnerHTML={{ __html: club.svg }} />}
              <div className="lp-who">
                <p className="lp-kicker">Carnet de hincha · {d.tier}</p>
                <p className="lp-name">{d.fan}</p>
                <p className="lp-sub">{d.games}</p>
              </div>
              <span className={`lp-medal lp-${d.tier.toLowerCase()}`}>{d.tier.toUpperCase()}</span>
            </div>
            <div className="lp-body">
              <div className="lp-gauge-box">
                <Gauge pct={d.pct} />
                <p className={`lp-verdict ${d.pct >= 60 ? "" : d.pct >= 40 ? "mid" : "bad"}`}>{verdict}</p>
              </div>
              <div className="lp-kpis">
                <div><b><CountUp value={d.w} duration={900} /></b><span>ganados</span></div>
                <div><b><CountUp value={d.d} duration={900} /></b><span>empates</span></div>
                <div><b><CountUp value={d.l} duration={900} /></b><span>perdidos</span></div>
              </div>
            </div>
            <div className="lp-form" aria-hidden="true">
              {form.map((f, i) => <i key={i} className={`lp-${f}`} style={{ "--i": i } as React.CSSProperties} />)}
            </div>
            <div className="lp-bars" aria-hidden="true">
              {bars.map((h, i) => <i key={i} style={{ height: `${h}%`, "--i": i } as React.CSSProperties} />)}
            </div>
            <p className="lp-cap">Efectividad por temporada</p>
            <div className="lp-rows">
              <div><span>Ídolo de galería</span><b>{d.idol}</b></div>
              <div><span>Tu verdugo</span><b>{d.foe}</b></div>
              <div><span>Rival favorito</span><b>{d.rival} · {d.rivalPct}%</b></div>
            </div>
          </div>
        </div>
      </div>
      {list.length > 1 && (
        <div className="lp-dots" aria-hidden="true">
          {list.map((_, i) => <i key={i} className={i === idx % list.length ? "on" : ""} />)}
        </div>
      )}
    </div>
  );
}
