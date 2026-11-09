import type { CrowdSummary, MatchPhase } from "@/lib/domain/matchPage.ts";
import { MIN_COMMUNITY_FANS } from "@/lib/domain/community.ts";
import { pct } from "../format.ts";

/** Lo que dice la hinchada: solo perfiles públicos y con al menos MIN_COMMUNITY_FANS hinchas detrás de cada cifra. */
export function CrowdSection({
  summary,
  phase,
  names,
  homeId,
  awayId,
}: {
  summary: CrowdSummary | null;
  phase: MatchPhase;
  names: Map<string, string>;
  homeId: string;
  awayId: string;
}) {
  const future = phase === "futuro";
  return (
    <section className="card">
      <h2 className="section-title">La hinchada en este partido</h2>
      {!summary ? (
        <p className="muted">
          Aún hay pocos datos de la hinchada: se muestran cuando al menos {MIN_COMMUNITY_FANS} hinchas con perfil público{" "}
          {future ? "dicen que van" : "lo marcan"}.
        </p>
      ) : (
        <>
          <p className="mp-big">
            <strong>{summary.fans}</strong> hinchas {future ? "dicen que van" : "ya lo marcaron como «Fui»"}
          </p>
          <ul className="mp-shares">
            {summary.clubs.map((c) => (
              <li key={c.clubId}>
                <span className="mp-share-name">{names.get(c.clubId) ?? c.clubId}</span>
                <span className="mp-bar" role="img" aria-label={`${c.pct}% de los hinchas`}>
                  <span style={{ width: `${Math.max(c.pct, 2)}%` }} />
                </span>
                <span className="mp-share-pct">{c.pct}%</span>
              </li>
            ))}
            {summary.others && (
              <li>
                <span className="mp-share-name">Otros hinchas</span>
                <span className="mp-bar" role="img" aria-label={`${summary.others.pct}% de los hinchas`}>
                  <span style={{ width: `${Math.max(summary.others.pct, 2)}%` }} />
                </span>
                <span className="mp-share-pct">{summary.others.pct}%</span>
              </li>
            )}
          </ul>
          {summary.clubs.some((c) => c.effectiveness !== null) && (
            <div className="mp-eff">
              <h3 className="cv-sub">Efectividad de quienes {future ? "van" : "fueron"}</h3>
              <ul>
                {summary.clubs
                  .filter((c) => c.effectiveness !== null)
                  .sort((a, b) => Number(b.clubId === homeId || b.clubId === awayId) - Number(a.clubId === homeId || a.clubId === awayId))
                  .map((c) => (
                    <li key={c.clubId}>
                      Hinchas de <strong>{names.get(c.clubId) ?? c.clubId}</strong>: {pct(c.effectiveness)}
                    </li>
                  ))}
              </ul>
              <p className="muted small">Promedio del Mufómetro de esos hinchas en todos los partidos que marcaron.</p>
            </div>
          )}
          <p className="muted small">Solo cuentan hinchas con perfil público; no se muestran cifras con menos de {MIN_COMMUNITY_FANS}.</p>
        </>
      )}
    </section>
  );
}
