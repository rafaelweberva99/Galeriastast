"use client";
import { useEffect, useRef, useState } from "react";

/** Ancho real del contenedor para dibujar SVG en píxeles reales (texto nítido y legible a 390 px). */
export function useWidth(initial = 320) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(200, Math.floor(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, w };
}
