import type { VerdictShares } from "@/lib/domain/community.ts";

/** Reparto cábala / neutro / yeta de una hinchada en una barra apilada con leyenda. */
export function VerdictBar({ shares }: { shares: VerdictShares }) {
  const parts = [
    { key: "cabala", label: "Cábalas", n: shares.cabala, pct: shares.pct.cabala, color: "var(--win)" },
    { key: "neutro", label: "Neutros", n: shares.neutro, pct: shares.pct.neutro, color: "var(--draw)" },
    { key: "yeta", label: "Yetas", n: shares.yeta, pct: shares.pct.yeta, color: "var(--loss)" },
  ];
  return (
    <div className="cm-verdict">
      <div
        className="cm-verdict-bar"
        role="img"
        aria-label={parts.map((p) => `${p.pct}% ${p.label.toLowerCase()}`).join(", ")}
      >
        {parts.map((p) => (p.pct > 0 ? <span key={p.key} style={{ width: `${p.pct}%`, background: p.color }} /> : null))}
      </div>
      <ul className="cm-legend">
        {parts.map((p) => (
          <li key={p.key}>
            <i style={{ background: p.color }} aria-hidden />
            <strong>{p.pct}%</strong> {p.label.toLowerCase()} <span className="muted small">({p.n})</span>
          </li>
        ))}
      </ul>
      <p className="muted small" style={{ margin: 0 }}>
        Entre los {shares.fans} hinchas con al menos 5 partidos de su club en la cancha. Cábala: más de 60 % de efectividad; yeta: menos de 40 %.
      </p>
    </div>
  );
}
