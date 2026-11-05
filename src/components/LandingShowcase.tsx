import { CountUp } from "./CountUp.tsx";
import { Reveal } from "./Reveal.tsx";

/** Vitrina de la portada: preguntas de hincha con su respuesta de ejemplo (datos ilustrativos, no de un hincha real). */
const SEASONS = [41, 55, 48, 62, 70, 58, 66, 74, 52, 69, 81];

export function LandingShowcase() {
  return (
    <section className="section sc" id="que-veras">
      <Reveal>
        <p className="lp-eyebrow">Lo que tu carnet te va a contar</p>
        <h2 className="lp-h2">¿Te gustaría saber…?</h2>
      </Reveal>
      <p className="sc-note">Así se ve con datos de ejemplo. El tuyo se arma con los partidos que tú marques.</p>

      <div className="sc-grid">
        <Reveal as="article" className="sc-card sc-wide" delay={0}>
          <p className="sc-q">¿Quién es el máximo goleador que viste en vivo?</p>
          <div className="sc-scorer">
            <span className="sc-rank">1</span>
            <div><b>Esteban Paredes</b><small>Colo-Colo · 14 partidos viéndolo</small></div>
            <strong>17 goles</strong>
          </div>
          <div className="sc-scorer alt">
            <span className="sc-rank">2</span>
            <div><b>Fernando Zampedri</b><small>Universidad Católica</small></div>
            <strong>9 goles</strong>
          </div>
          <div className="sc-scorer alt">
            <span className="sc-rank">3</span>
            <div><b>Mauricio Pinilla</b><small>Universidad de Chile</small></div>
            <strong>8 goles</strong>
          </div>
          <p className="sc-foot">…y también tu <b>verdugo</b>: el que más te amargó la tarde.</p>
        </Reveal>

        <Reveal as="article" className="sc-card" delay={90}>
          <p className="sc-q">¿Eres cábala o yeta?</p>
          <div className="sc-big win"><CountUp value={68} suffix="%" /></div>
          <p className="sc-cap">de efectividad cuando tú vas. <b>¡Eres cábala!</b></p>
          <div className="sc-meter"><i style={{ left: "68%" }} /></div>
          <div className="sc-scale"><span>Yeta</span><span>Cábala</span></div>
        </Reveal>

        <Reveal as="article" className="sc-card" delay={180}>
          <p className="sc-q">¿Cuál fue tu peor noche?</p>
          <div className="sc-score loss"><span>Colo-Colo</span><b>0 – 4</b><span>Católica</span></div>
          <p className="sc-cap">Y también tu mejor goleada, tu racha más larga sin perder y el año que más sufriste.</p>
        </Reveal>

        <Reveal as="article" className="sc-card sc-wide" delay={0}>
          <p className="sc-q">¿En qué temporadas te fue mejor?</p>
          <div className="sc-bars" aria-hidden="true">
            {SEASONS.map((h, i) => (
              <div key={i}><i style={{ height: `${h}%`, "--i": i } as React.CSSProperties} /><span>{String(15 + i).padStart(2, "0")}</span></div>
            ))}
          </div>
          <p className="sc-cap">Gráfico por temporada, curva de forma, local vs visita y rendimiento contra cada rival.</p>
        </Reveal>

        <Reveal as="article" className="sc-card" delay={90}>
          <p className="sc-q">¿Cómo te va en los clásicos?</p>
          <div className="sc-versus v-win" style={{ "--p": "64%" } as React.CSSProperties}><span>vs Universidad de Chile</span><b className="win">64%</b></div>
          <div className="sc-versus v-draw" style={{ "--p": "52%" } as React.CSSProperties}><span>vs Universidad Católica</span><b className="draw">52%</b></div>
          <div className="sc-versus v-loss" style={{ "--p": "33%" } as React.CSSProperties}><span>vs Cobreloa</span><b className="loss">33%</b></div>
        </Reveal>

        <Reveal as="article" className="sc-card sc-wide" delay={180}>
          <p className="sc-q">¿Y contra tus amigos?</p>
          <div className="sc-vs"><b>@tú</b><span>VS</span><b>@amigo</b></div>
          <p className="sc-cap">Compara Mufómetros, partidos en común y quién es más cábala. Con link para compartir.</p>
        </Reveal>

        <Reveal as="article" className="sc-card sc-wide sc-year" delay={0}>
          <div>
            <p className="sc-q">Tu resumen del año, listo para compartir</p>
            <p className="sc-cap">Una imagen con tus partidos, tu ídolo y tu veredicto, para historias o WhatsApp. Más premios, niveles de carnet (Bronce a Oro) y el ranking de tu hinchada.</p>
          </div>
          <div className="sc-badges" aria-hidden="true">
            <span>🏆 Carnet Oro</span><span>🔥 Racha de 7</span><span>⚽ Ídolo</span><span>🎟️ 74 partidos</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
