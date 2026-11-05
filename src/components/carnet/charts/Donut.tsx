/** Dona G-E-P del total de partidos, con el total al centro y la leyenda al lado. */
export function Donut({ g, e, p, size = 150 }: { g: number; e: number; p: number; size?: number }) {
  const pj = g + e + p;
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const parts = ([
    ["win", g, "Ganados"],
    ["draw", e, "Empatados"],
    ["loss", p, "Perdidos"],
  ] as const).map(([z, n, name]) => {
    const len = pj ? (n / pj) * c : 0;
    const part = { z, n, name, len, offset };
    offset += len;
    return part;
  });
  return (
    <div className="cv-donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${pj} partidos: ${g} ganados, ${e} empatados, ${p} perdidos`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={16} className="cv-track-stroke" />
        {parts.map(
          (s) =>
            s.n > 0 && (
              <circle
                key={s.z}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={16}
                stroke={`var(--${s.z})`}
                strokeDasharray={`${Math.max(0, s.len - 2)} ${c - Math.max(0, s.len - 2)}`}
                strokeDashoffset={-s.offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
              >
                <title>{`${s.name}: ${s.n}`}</title>
              </circle>
            ),
        )}
        <text x="50%" y={size / 2 + 4} textAnchor="middle" className="cv-donut-num">
          {pj}
        </text>
        <text x="50%" y={size / 2 + 22} textAnchor="middle" className="cv-axis">
          partidos
        </text>
      </svg>
      <ul className="cv-donut-legend">
        {parts.map((s) => (
          <li key={s.z}>
            <i className={`cv-dot-key ${s.z}`} /> <b>{s.n}</b> {s.name.toLowerCase()}
          </li>
        ))}
      </ul>
    </div>
  );
}
