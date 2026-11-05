"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Cifra que cuenta hacia arriba cuando entra en pantalla. El servidor (y sin JS) muestra el valor final;
 * con "reducir movimiento" no anima nunca.
 */
export function CountUp({ value, suffix = "", duration = 1400 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    setShown(0);
  }, [value]);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const t0 = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / duration);
          setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className="countup">
      {shown.toLocaleString("es-CL")}
      {suffix}
    </span>
  );
}
