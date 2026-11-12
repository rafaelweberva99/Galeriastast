"use client";

import { usePathname, useRouter } from "next/navigation";

/** Padre lógico de una ruta: adonde se vuelve si no hay historial (entró directo por un enlace). */
function parentOf(path: string): string {
  const m = path.match(/^\/hincha\/([^/]+)\/resumen\//);
  if (m) return `/hincha/${m[1]}`;
  if (/^\/estadisticas\/[^/]+/.test(path)) return "/estadisticas";
  if (/^\/clubes\/[^/]+/.test(path)) return "/clubes";
  if (/^\/hincha\//.test(path)) return "/rankings";
  if (/^\/partidos\/[^/]+/.test(path)) return "/partidos";
  return "/";
}

/** Botón "Volver" en todas las páginas menos el inicio: vuelve en el historial o, si no hay, a la página madre. */
export function BackBar() {
  const path = usePathname();
  const router = useRouter();
  // Sin "Volver" en el inicio ni en las secciones principales del menú (no tienen una página anterior lógica).
  if (path === "/" || path === "/carnet" || path === "/partidos" || path === "/seleccion" || path === "/seleccion/partidos" || path === "/rankings" || path === "/clubes" || path === "/estadisticas") return null;
  const fallback = parentOf(path);
  return (
    <div className="container back-bar">
      <button
        type="button"
        className="back-btn"
        onClick={() => {
          // history.length > 1 y mismo sitio de origen → atrás; si no, a la página madre.
          const sameOrigin = document.referrer && new URL(document.referrer).origin === location.origin;
          if (window.history.length > 1 && sameOrigin) router.back();
          else router.push(fallback);
        }}
      >
        <span aria-hidden="true">←</span> Volver
      </button>
    </div>
  );
}
