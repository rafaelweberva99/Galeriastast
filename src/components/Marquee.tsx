"use client";

import { useEffect, useRef } from "react";

const BASE = 38; // px/s: avance normal hacia la izquierda
const MAX = 900; // px/s: velocidad con el mouse pegado a un extremo

/**
 * Cinta de clubes. Avanza sola; con el mouse encima se detiene en el centro y, hacia un extremo,
 * acelera en esa dirección (derecha = avanza más rápido, izquierda = retrocede). Dentro hay dos copias
 * de la lista para que el bucle sea continuo.
 */
export function Marquee({ children, label }: { children: React.ReactNode; label: string }) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const tr = track.current;
    if (!el || !tr || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let x = 0;
    let target = BASE; // velocidad objetivo (px/s, positiva = hacia la izquierda)
    let v = BASE;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      v += (target - v) * Math.min(1, dt * 6); // suaviza los cambios de velocidad
      const half = tr.scrollWidth / 2;
      x = (x + v * dt) % half;
      if (x < 0) x += half;
      tr.style.transform = `translate3d(${-x}px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const r = el.getBoundingClientRect();
      const p = ((e.clientX - r.left) / r.width) * 2 - 1; // -1 izquierda … 1 derecha
      const dead = 0.35; // zona central: pausa
      if (Math.abs(p) < dead) target = 0;
      else target = Math.sign(p) * ((Math.abs(p) - dead) / (1 - dead)) ** 1.6 * MAX + Math.sign(p) * BASE;
    };
    const leave = () => (target = BASE);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div className="marquee bleed" aria-label={label} ref={root}>
      <div className="marquee-track" ref={track}>
        {children}
      </div>
    </div>
  );
}
