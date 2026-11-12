import Link from "next/link";
import type { ClubView } from "@/lib/carnet.ts";

/** Selector entre el club principal, el segundo club y la suma de ambos (solo si el hincha tiene segundo club). */
export function ClubSwitch({ base, view, main, second }: { base: string; view: ClubView; main: string; second: string }) {
  const items: { key: ClubView; label: string; href: string }[] = [
    { key: "principal", label: main, href: base },
    { key: "segundo", label: second, href: `${base}?club=segundo` },
    { key: "suma", label: "Suma de los dos", href: `${base}?club=suma` },
  ];
  return (
    <nav className="cv-seg club-switch" aria-label="Elegir club">
      {items.map((i) => (
        <Link key={i.key} href={i.href} aria-current={view === i.key ? "page" : undefined} className={view === i.key ? "is-active" : undefined} scroll={false}>
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
