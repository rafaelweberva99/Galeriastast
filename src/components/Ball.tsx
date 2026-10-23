/** Pelota de fútbol simplificada (pentágono central y paneles), en SVG. */
export function Ball({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <circle cx="16" cy="16" r="15" fill="#ffffff" stroke="#111" strokeWidth="1.5" />
      <path d="M16 9.5 L21.5 13.5 L19.4 20 L12.6 20 L10.5 13.5 Z" fill="#111" />
      <path
        d="M16 9.5 V3 M21.5 13.5 L27.6 11.3 M19.4 20 L23.3 25.4 M12.6 20 L8.7 25.4 M10.5 13.5 L4.4 11.3"
        stroke="#111"
        strokeWidth="1.5"
      />
    </svg>
  );
}
