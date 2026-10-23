import type { Verdict } from "@/lib/domain/stats.ts";

/** Medidor semicircular de efectividad: 0% (yeta) a 100% (cábala), con marcas en 40% y 60%. */
export function Mufometro({ value, verdict }: { value: number | null; verdict: Verdict }) {
  const r = 80;
  const cx = 100;
  const cy = 95;
  const point = (p: number) => {
    const a = Math.PI * (1 - p / 100);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
  };
  const arc = (from: number, to: number) => {
    const [x1, y1] = point(from);
    const [x2, y2] = point(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const shown = verdict.key === "sin-datos" ? null : value;
  const [nx, ny] = point(shown ?? 50);
  return (
    <svg viewBox="0 0 200 120" width="220" role="img" aria-label={`Mufómetro: ${verdict.label}`}>
      <path d={arc(0, 40)} stroke="var(--loss)" strokeWidth="14" fill="none" />
      <path d={arc(40, 60)} stroke="var(--draw)" strokeWidth="14" fill="none" />
      <path d={arc(60, 100)} stroke="var(--win)" strokeWidth="14" fill="none" />
      {shown !== null && (
        <>
          <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="var(--text)" strokeWidth="4" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="6" fill="var(--text)" />
        </>
      )}
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--text)">
        {shown === null ? "?" : `${shown.toFixed(0)}%`}
      </text>
    </svg>
  );
}
