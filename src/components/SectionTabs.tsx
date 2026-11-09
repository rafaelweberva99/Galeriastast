"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string };
type Group = { prefixes: string[]; tabs: Tab[]; needsLogin?: boolean };

const GROUPS: Group[] = [
  {
    prefixes: ["/partidos", "/importar"],
    needsLogin: true,
    tabs: [
      { href: "/partidos", label: "Marcar a mano" },
      { href: "/importar", label: "Subir entradas" },
    ],
  },
  {
    prefixes: ["/estadisticas", "/rankings", "/clubes"],
    tabs: [
      { href: "/estadisticas", label: "Estadísticas" },
      { href: "/rankings", label: "Rankings" },
      { href: "/clubes", label: "Clubes" },
    ],
  },
];

const on = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/** Pestañas de la sección actual: así el menú de arriba se mantiene corto (Partidos y Comunidad agrupan varias páginas). */
export function SectionTabs({ loggedIn }: { loggedIn: boolean }) {
  const path = usePathname();
  // /partidos/[id] es la ficha de un partido, no la lista para marcar.
  const group = GROUPS.find((g) => g.prefixes.some((p) => on(path, p)) && (!g.needsLogin || loggedIn));
  if (!group || /^\/partidos\/[^/]+/.test(path)) return null;
  return (
    <div className="section-tabs">
      <nav className="container tabs-row" aria-label="Secciones">
        {group.tabs.map((t) => (
          <Link key={t.href} href={t.href} aria-current={on(path, t.href) ? "page" : undefined}>
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
