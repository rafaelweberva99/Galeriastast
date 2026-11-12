import Link from "next/link";
import type { ClubView } from "@/lib/carnet.ts";
import type { Suma } from "@/lib/domain/suma.ts";

const pct = (v: number | null) => (v === null ? "" : ` · ${Math.round(v)}%`);
const games = (n: number) => `${n} ${n === 1 ? "partido" : "partidos"}`;

/** Selector entre el club principal, el segundo club y la suma de ambos, con las cifras de cada uno a la vista. */
export function ClubSwitch({
  base,
  view,
  main,
  second,
  suma,
  mainColor,
  secondColor,
}: {
  base: string;
  view: ClubView;
  main: string;
  second: string;
  suma: Suma;
  mainColor?: string;
  secondColor?: string;
}) {
  const [a, b] = suma.clubs;
  const items: { key: ClubView; label: string; sub: string; href: string; color?: string }[] = [
    { key: "principal", label: main, sub: `${games(a.total)}${pct(a.effectiveness)}`, href: base, color: mainColor },
    { key: "segundo", label: second, sub: `${games(b.total)}${pct(b.effectiveness)}`, href: `${base}?club=segundo`, color: secondColor },
    { key: "suma", label: "Suma de los dos", sub: `${games(suma.total)}${pct(suma.effectiveness)}`, href: `${base}?club=suma` },
  ];
  return (
    <nav className="club-switch" aria-label="Elegir club">
      <span className="club-switch-title">Tus dos clubes · elige cuál ver</span>
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={view === i.key ? "page" : undefined}
          className={view === i.key ? "is-active" : undefined}
          style={i.color ? ({ "--dot": i.color } as React.CSSProperties) : undefined}
          scroll={false}
        >
          <strong>{i.label}</strong>
          <small>{i.sub}</small>
        </Link>
      ))}
    </nav>
  );
}
