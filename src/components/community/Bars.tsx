import Link from "next/link";

export interface BarItem {
  key: string;
  label: string;
  sub?: string;
  value: number;
  /** Texto a la derecha de la barra (por defecto el valor). */
  valueLabel?: string;
  href?: string;
}

/** Barras horizontales en CSS: el ancho es proporcional al mayor valor (o a `max`). */
export function HBars({ items, max, unit }: { items: BarItem[]; max?: number; unit?: string }) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ol className="cm-bars">
      {items.map((i) => {
        const name = i.href ? (
          <Link href={i.href} className="cm-bar-name">
            {i.label}
          </Link>
        ) : (
          <span className="cm-bar-name">{i.label}</span>
        );
        return (
          <li key={i.key}>
            <div className="cm-bar-head">
              {name}
              <span className="cm-bar-val">
                {i.valueLabel ?? i.value}
                {unit ? <small> {unit}</small> : null}
              </span>
            </div>
            {i.sub ? <div className="cm-bar-sub muted small">{i.sub}</div> : null}
            <div className="cm-bar-track" aria-hidden>
              <span style={{ width: `${Math.max(3, (i.value / top) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
