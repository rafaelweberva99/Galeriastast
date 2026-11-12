"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { inSeleccion } from "./ModeBar.tsx";

export type NavItem = { href: string; label: string; cta?: boolean; /** Otras rutas que también marcan este enlace como activo. */ also?: string[] };

/** ¿La ruta actual cuelga de este enlace? (el inicio solo coincide exacto). */
function isActive(path: string, href: string): boolean {
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}

/**
 * Menú principal: marca la ruta actual y desliza una pastilla bajo el enlace que tocas o miras.
 * También compacta la cabecera (sombra + menos alto) al hacer scroll. Los hijos (p. ej. el botón "Salir") van al final.
 */
export function SiteNav({ items, selItems, children }: { items: NavItem[]; /** Menú de la sección de la Selección. */ selItems?: NavItem[]; children?: React.ReactNode }) {
  const path = usePathname();
  const list = selItems && inSeleccion(path) ? selItems : items;
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  const moveTo = (el: HTMLElement | null) => {
    if (!el) return setPill(null);
    setPill({ x: el.offsetLeft, w: el.offsetWidth });
  };
  const toActive = () => moveTo(navRef.current?.querySelector<HTMLElement>('a[aria-current="page"]:not(.nav-cta)') ?? null);

  useEffect(() => {
    toActive();
    const onResize = () => toActive();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, list.length]);

  // Cabecera compacta al bajar (solo cambia un atributo; el CSS hace el resto).
  useEffect(() => {
    const header = navRef.current?.closest<HTMLElement>(".site-header");
    if (!header) return;
    // Con histéresis (se activa pasado 40 px y se apaga bajo 8) para que no parpadee cerca del umbral.
    const onScroll = () => {
      const y = window.scrollY;
      if (y > 40) header.setAttribute("data-scrolled", "");
      else if (y < 8) header.removeAttribute("data-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className="nav"
      aria-label="Principal"
      ref={navRef}
      onPointerLeave={toActive}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) toActive();
      }}
    >
      <span
        className="nav-pill"
        aria-hidden="true"
        style={pill ? { opacity: 1, width: pill.w, transform: `translateX(${pill.x}px)` } : undefined}
      />
      {list.map((it) => {
        const active = !it.cta && (isActive(path, it.href) || !!it.also?.some((h) => isActive(path, h)));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={it.cta ? "nav-cta" : undefined}
            aria-current={active ? "page" : undefined}
            onPointerEnter={(e) => !it.cta && moveTo(e.currentTarget)}
            onFocus={(e) => !it.cta && moveTo(e.currentTarget)}
          >
            {it.label}
          </Link>
        );
      })}
      {children}
    </nav>
  );
}
