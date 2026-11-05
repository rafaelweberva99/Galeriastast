"use client";

import { useLayoutEffect, useRef } from "react";

/**
 * Entrada al hacer scroll: el contenido existe y se ve siempre (SSR, sin JS); recién con JS se oculta
 * un instante (rv-wait) y se muestra (rv-in) al entrar en pantalla. `delay` en ms para escalonar.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article" | "li";
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    el.classList.add("rv-wait");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        el.classList.add("rv-in");
        el.classList.remove("rv-wait");
        io.disconnect();
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Any = Tag as React.ElementType;
  return (
    <Any ref={ref} className={`rv ${className}`.trim()} style={delay ? { "--rv-d": `${delay}ms` } : undefined}>
      {children}
    </Any>
  );
}
