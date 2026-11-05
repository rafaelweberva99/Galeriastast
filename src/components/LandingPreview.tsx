/** Maqueta ilustrativa del carnet para la portada: datos de ejemplo, no de un hincha real. */
const BARS = [38, 52, 61, 44, 70, 66, 58, 74, 49, 63, 81];
const FORM = ["w", "w", "d", "l", "w", "w", "w", "l", "d", "w"];

function Gauge() {
  const r = 70, cx = 90, cy = 86;
  const pt = (p: number) => {
    const a = Math.PI * (1 - p / 100);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)] as const;
  };
  const arc = (a: number, b: number) => {
    const [x1, y1] = pt(a), [x2, y2] = pt(b);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const [nx, ny] = pt(68);
  return (
    <svg viewBox="0 0 180 112" className="lp-gauge" aria-hidden="true">
      <path d={arc(0, 40)} stroke="var(--loss)" strokeWidth="13" fill="none" />
      <path d={arc(40, 60)} stroke="var(--draw)" strokeWidth="13" fill="none" />
      <path d={arc(60, 100)} stroke="var(--win)" strokeWidth="13" fill="none" />
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="#121a15" strokeWidth="4" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="#121a15" />
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="22" fontWeight="700" fontFamily="var(--font-display), sans-serif" fill="#121a15">68%</text>
    </svg>
  );
}

export function LandingPreview() {
  return (
    <div className="lp" aria-label="Ejemplo de carnet de hincha">
      <span className="lp-tag">Ejemplo</span>
      <div className="lp-card">
        <div className="lp-head">
          <div>
            <p className="lp-kicker">Carnet de hincha · Oro</p>
            <p className="lp-name">Nacho Bulla</p>
            <p className="lp-sub">74 partidos · 2011–2026</p>
          </div>
          <span className="lp-medal">ORO</span>
        </div>
        <div className="lp-body">
          <div className="lp-gauge-box">
            <Gauge />
            <p className="lp-verdict">¡Eres cábala!</p>
          </div>
          <div className="lp-kpis">
            <div><b>39</b><span>ganados</span></div>
            <div><b>18</b><span>empates</span></div>
            <div><b>17</b><span>perdidos</span></div>
          </div>
        </div>
        <div className="lp-form" aria-hidden="true">
          {FORM.map((f, i) => <i key={i} className={`lp-${f}`} />)}
        </div>
        <div className="lp-bars" aria-hidden="true">
          {BARS.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
        </div>
        <p className="lp-cap">Efectividad por temporada</p>
        <div className="lp-rows">
          <div><span>Ídolo de galería</span><b>Pinilla · 9 goles</b></div>
          <div><span>Tu verdugo</span><b>Munder · 3 goles</b></div>
          <div><span>Clásico favorito</span><b>vs Colo-Colo · 61%</b></div>
        </div>
      </div>
    </div>
  );
}
