import { useId } from "react";
import type { ClubIdentity } from "@/lib/clubTheme.ts";

const BODY = "M20 6 L26 4 Q32 10 38 4 L44 6 L58 17 L51 28 L46 24 L46 60 L18 60 L18 24 L13 28 L6 17 Z";
const LEFT_SLEEVE = "M20 6 L6 17 L13 28 L18 24 L18 12 Z";
const RIGHT_SLEEVE = "M44 6 L58 17 L51 28 L46 24 L46 12 Z";

/** Camiseta genérica con los colores del club. `number` se dibuja en el pecho (el 12 es la hinchada). */
export function Jersey({ club, size = 48, number }: { club: ClubIdentity; size?: number; number?: string }) {
  const clip = useId().replace(/:/g, "");
  const j = club.jersey;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role="img" aria-label={`Camiseta de ${club.short}`} style={{ flexShrink: 0 }}>
      <defs>
        <clipPath id={clip}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <path d={BODY} fill={j.body} />
      <g clipPath={`url(#${clip})`}>
        {j.motif === "chest-band" && <rect x="0" y="25" width="64" height="11" fill={j.motifColor} />}
        {j.motif === "stripes" &&
          [20, 28, 36, 44].map((x) => <rect key={x} x={x} y="0" width="4" height="64" fill={j.motifColor} />)}
        <path d={LEFT_SLEEVE} fill={j.sleeves} />
        <path d={RIGHT_SLEEVE} fill={j.sleeves} />
        <path d="M6 17 L13 28" stroke={j.trim} strokeWidth="3" />
        <path d="M58 17 L51 28" stroke={j.trim} strokeWidth="3" />
      </g>
      <path d="M26 4 Q32 10 38 4" fill="none" stroke={j.collar} strokeWidth="3.5" strokeLinecap="round" />
      <path d={BODY} fill="none" stroke="rgb(0 0 0 / 0.35)" strokeWidth="1.2" strokeLinejoin="round" />
      {number && (
        <text
          x="32"
          y={j.motif === "chest-band" ? 52 : 46}
          textAnchor="middle"
          fontSize="17"
          fontWeight="700"
          fontFamily="var(--font-display), sans-serif"
          fill={j.motif === "chest-band" ? j.motifColor : j.collar}
        >
          {number}
        </text>
      )}
    </svg>
  );
}
