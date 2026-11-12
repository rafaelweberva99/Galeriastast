"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ball } from "./Ball.tsx";

/** ¿La ruta actual pertenece a la sección de la Selección? */
export function inSeleccion(path: string): boolean {
  return path === "/seleccion" || path.startsWith("/seleccion/") || path === "/clubes/seleccion-chilena" || path === "/estadisticas/seleccion-chilena";
}

/**
 * Barra de modo, justo bajo el menú: dos secciones que se distinguen a primera vista,
 * la Liga chilena (clubes) y la Selección chilena (La Roja).
 */
export function ModeBar({ ligaHref }: { ligaHref: string }) {
  const path = usePathname();
  const sel = inSeleccion(path);
  return (
    <div className="mode-bar" role="navigation" aria-label="Elegir sección">
      <div className="container mode-bar-row">
        <Link href={ligaHref} className="mode-opt mode-liga" aria-current={sel ? undefined : "page"}>
          <span className="mode-ico" aria-hidden="true">
            <Ball size={22} />
          </span>
          <span className="mode-txt">
            <strong>Liga chilena</strong>
            <small>Tu club · Primera División</small>
          </span>
        </Link>
        <Link href="/seleccion" className="mode-opt mode-sel" aria-current={sel ? "page" : undefined}>
          <span className="mode-ico mode-star" aria-hidden="true">★</span>
          <span className="mode-txt">
            <strong>Selección chilena</strong>
            <small>La Roja · eliminatorias, Copa América…</small>
          </span>
        </Link>
      </div>
    </div>
  );
}
