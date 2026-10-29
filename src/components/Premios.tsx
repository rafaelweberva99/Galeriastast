import { RUEDA_COMPLETA, TIERS, type Achievements } from "@/lib/domain/achievements.ts";

/** Premios del hincha: niveles del carnet, una rueda completa y temporadas perfectas. */
export function Premios({ a, owner }: { a: Achievements; owner: boolean }) {
  const t = owner ? "te" : "le";
  const seasons = (list: { season: number }[]) => list.map((s) => s.season).join(", ");
  return (
    <section className="card premios" aria-labelledby="premios-title">
      <h2 id="premios-title" className="section-title" style={{ margin: 0 }}>
        Premios
      </h2>

      <div className="tier-ladder" role="list" aria-label="Niveles del carnet">
        {TIERS.map((tier) => {
          const got = a.total >= tier.min;
          return (
            <div key={tier.key} role="listitem" className={`tier-step tier-${tier.key} ${got ? "got" : ""}`}>
              <span className="tier-chip" aria-hidden />
              <strong>{tier.key === "socio" ? "Socio" : tier.label.replace("Carnet ", "")}</strong>
              <span className="small muted">{tier.min === 0 ? "al registrarte" : `${tier.min} partidos`}</span>
            </div>
          );
        })}
      </div>
      <p className="small" style={{ margin: 0 }}>
        {a.next
          ? `${owner ? "Tu" : "Su"} carnet es ${a.tier.key === "socio" ? "de socio" : a.tier.label.replace("Carnet ", "").toLowerCase()}. ${t[0].toUpperCase()}${t.slice(1)} faltan ${a.next.min - a.total} para el ${a.next.label.replace("Carnet ", "").toLowerCase()}.`
          : `${owner ? "Tu" : "Su"} carnet es Leyenda: más de 200 partidos en la galería.`}
      </p>

      <div className="premio-grid">
        <div className={`premio ${a.rueda.done ? "got" : ""}`}>
          <span className="premio-icon" aria-hidden>
            🔄
          </span>
          <div>
            <strong>Una rueda completa</strong>
            <p className="small muted" style={{ margin: 0 }}>
              {a.rueda.done
                ? `${RUEDA_COMPLETA} partidos en la galería, de local o de visita. ¡Logrado!`
                : `${RUEDA_COMPLETA} partidos en la galería, de local o de visita. ${t[0].toUpperCase()}${t.slice(1)} ${a.rueda.missing === 1 ? "falta 1" : `faltan ${a.rueda.missing}`}.`}
            </p>
          </div>
        </div>

        <div className={`premio ${a.perfectLeague.length ? "got" : ""}`}>
          <span className="premio-icon" aria-hidden>
            🏟️
          </span>
          <div>
            <strong>Temporada perfecta</strong>
            <p className="small muted" style={{ margin: 0 }}>
              {a.perfectLeague.length
                ? `Fue a todos los partidos de liga de su club en ${seasons(a.perfectLeague)}. ¡Hincha de todas!`
                : a.closest
                  ? `Ir al 100% de los partidos de liga de una temporada. Lo más cerca: ${a.closest.attended} de ${a.closest.matches} en ${a.closest.season}.`
                  : "Ir al 100% de los partidos de liga de una temporada."}
            </p>
          </div>
        </div>

        <div className={`premio especial ${a.perfectTotal.length ? "got" : ""}`}>
          <span className="premio-icon" aria-hidden>
            👑
          </span>
          <div>
            <strong>Temporada perfecta total</strong>
            <p className="small muted" style={{ margin: 0 }}>
              {a.perfectTotal.length
                ? `Todos los partidos oficiales del año (liga, copas e internacionales) en ${seasons(a.perfectTotal)}. Leyenda absoluta.`
                : "Todos los partidos oficiales de un año: liga, copas e internacionales. El premio más difícil."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
