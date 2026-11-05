/** Vitrina de la portada: preguntas de hincha con su respuesta de ejemplo (datos ilustrativos, no de un hincha real). */
const SEASONS = [41, 55, 48, 62, 70, 58, 66, 74, 52, 69, 81];

export function LandingShowcase() {
  return (
    <section className="section sc" id="que-veras">
      <p className="lp-eyebrow">Lo que tu carnet te va a contar</p>
      <h2 className="lp-h2">¿Te gustaría saber…?</h2>
      <p className="sc-note">Así se ve con datos de ejemplo. El tuyo se arma con los partidos que tú marques.</p>

      <div className="sc-grid">
        <article className="sc-card sc-wide">
          <p className="sc-q">¿Quién es el máximo goleador que viste en vivo?</p>
          <div className="sc-scorer">
            <span className="sc-rank">1</span>
            <div><b>Esteban Paredes</b><small>Colo-Colo · 14 partidos viéndolo</small></div>
            <strong>17 goles</strong>
          </div>
          <div className="sc-scorer alt">
            <span className="sc-rank">2</span>
            <div><b>Junior Fernandes</b><small>Universidad Católica</small></div>
            <strong>9 goles</strong>
          </div>
          <div className="sc-scorer alt">
            <span className="sc-rank">3</span>
            <div><b>Sebastián Pinilla</b><small>Universidad de Chile</small></div>
            <strong>8 goles</strong>
          </div>
          <p className="sc-foot">…y también tu <b>verdugo</b>: el que más te amargó la tarde.</p>
        </article>

        <article className="sc-card">
          <p className="sc-q">¿Eres cábala o yeta?</p>
          <div className="sc-big win">68%</div>
          <p className="sc-cap">de efectividad cuando tú vas. <b>¡Eres cábala!</b></p>
          <div className="sc-meter"><i style={{ left: "68%" }} /></div>
          <div className="sc-scale"><span>Yeta</span><span>Cábala</span></div>
        </article>

        <article className="sc-card">
          <p className="sc-q">¿Cuál fue tu peor noche?</p>
          <div className="sc-score loss"><span>Colo-Colo</span><b>0 – 4</b><span>Católica</span></div>
          <p className="sc-cap">Y también tu mejor goleada, tu racha más larga sin perder y el año que más sufriste.</p>
        </article>

        <article className="sc-card sc-wide">
          <p className="sc-q">¿En qué temporadas te fue mejor?</p>
          <div className="sc-bars" aria-hidden="true">
            {SEASONS.map((h, i) => (
              <div key={i}><i style={{ height: `${h}%` }} /><span>{String(15 + i).padStart(2, "0")}</span></div>
            ))}
          </div>
          <p className="sc-cap">Gráfico por temporada, curva de forma, local vs visita y rendimiento contra cada rival.</p>
        </article>

        <article className="sc-card">
          <p className="sc-q">¿Cómo te va en los clásicos?</p>
          <div className="sc-versus"><span>vs Universidad de Chile</span><b className="win">64%</b></div>
          <div className="sc-versus"><span>vs Universidad Católica</span><b className="draw">52%</b></div>
          <div className="sc-versus"><span>vs Cobreloa</span><b className="loss">33%</b></div>
        </article>

        <article className="sc-card sc-wide">
          <p className="sc-q">¿Y contra tus amigos?</p>
          <div className="sc-vs"><b>@tú</b><span>VS</span><b>@amigo</b></div>
          <p className="sc-cap">Compara Mufómetros, partidos en común y quién es más cábala. Con link para compartir.</p>
        </article>

        <article className="sc-card sc-wide sc-year">
          <div>
            <p className="sc-q">Tu resumen del año, listo para compartir</p>
            <p className="sc-cap">Una imagen con tus partidos, tu ídolo y tu veredicto, para historias o WhatsApp. Más premios, niveles de carnet (Bronce a Oro) y el ranking de tu hinchada.</p>
          </div>
          <div className="sc-badges" aria-hidden="true">
            <span>🏆 Carnet Oro</span><span>🔥 Racha de 7</span><span>⚽ Ídolo</span><span>🎟️ 74 partidos</span>
          </div>
        </article>
      </div>
    </section>
  );
}
