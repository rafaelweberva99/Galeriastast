import type { Highlight } from "@/lib/domain/insights/types.ts";

const GLYPH = { good: "▲", bad: "▼", fun: "★", neutral: "●" } as const;
const TONE_LABEL = { good: "Buena", bad: "Mala", fun: "Dato", neutral: "Dato" } as const;

function Card({ h }: { h: Highlight }) {
  return (
    <li className={`cv-hl ${h.tone}`}>
      <span className="cv-hl-glyph" aria-hidden>
        {GLYPH[h.tone]}
      </span>
      <div>
        <h3>
          <span className="sr-only">{TONE_LABEL[h.tone]}: </span>
          {h.title}
        </h3>
        <p>{h.text}</p>
      </div>
    </li>
  );
}

/** Frases destacadas del carnet (las más sorprendentes primero): las primeras a la vista, el resto plegado. */
export function Highlights({ highlights, visible = 4 }: { highlights: Highlight[]; visible?: number }) {
  const sorted = [...highlights].sort((a, b) => b.weight - a.weight);
  if (!sorted.length) {
    return <p className="muted cv-empty">Marca unos partidos más y te armamos frases destacadas con lo que se repite en tu carnet.</p>;
  }
  return (
    <>
      <ul className="cv-hl-grid">
        {sorted.slice(0, visible).map((h) => (
          <Card key={h.id} h={h} />
        ))}
      </ul>
      {sorted.length > visible && (
        <details className="cv-more-details">
          <summary>Ver {sorted.length - visible} más</summary>
          <ul className="cv-hl-grid">
            {sorted.slice(visible).map((h) => (
              <Card key={h.id} h={h} />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
