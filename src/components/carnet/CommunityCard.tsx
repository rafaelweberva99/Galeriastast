import Link from "next/link";
import { MIN_COMMUNITY_FANS, type CommunityComparison } from "@/lib/domain/community.ts";

/**
 * Tarjeta "Tu año y tu hinchada" del carnet: accesos al resumen anual (uno por año con partidos) y cómo te comparas con los
 * demás hinchas públicos del club (solo con 5 o más, para no identificar a nadie).
 */
export function CommunityCard({
  username,
  clubId,
  clubName,
  years,
  comparison,
  owner,
}: {
  username: string;
  clubId: string;
  clubName: string;
  years: number[];
  comparison: CommunityComparison | null;
  owner: boolean;
}) {
  const subject = owner ? "Tu" : "Su";
  return (
    <section className="card cv-card cv-community">
      <h2 className="section-title cv-card-title">{subject} año en la galería</h2>
      {years.length > 0 ? (
        <>
          <p className="muted small cv-card-hint">Un resumen para mirar y compartir, año por año.</p>
          <div className="row cv-year-links">
            {years.slice(0, 5).map((y) => (
              <Link key={y} className="btn btn-ghost" href={`/hincha/${encodeURIComponent(username)}/resumen/${y}`}>
                {y}
              </Link>
            ))}
          </div>
        </>
      ) : (
        <p className="muted small">Cuando haya partidos marcados verás aquí el resumen de cada año.</p>
      )}

      <h3 className="cv-sub">Entre los hinchas de {clubName}</h3>
      {comparison ? (
        <ul className="cv-compare">
          <li>
            <strong>#{comparison.attendedRank}</strong> de {comparison.attendedOf} en partidos marcados
            <span className="muted small"> · {owner ? "superas" : "supera"} al {Math.round(comparison.attendedPercentile)} % de los hinchas</span>
          </li>
          {comparison.effectivenessPercentile !== null && comparison.effectivenessRank !== null && comparison.effectivenessOf !== null && (
            <li>
              <strong>#{comparison.effectivenessRank}</strong> de {comparison.effectivenessOf} en Mufómetro
              <span className="muted small"> · {owner ? "eres" : "es"} más cábala que el {Math.round(comparison.effectivenessPercentile)} % de la hinchada</span>
            </li>
          )}
        </ul>
      ) : (
        <p className="muted small">
          Cuando haya {MIN_COMMUNITY_FANS} hinchas públicos de {clubName} verás aquí cómo {owner ? "te comparas" : "se compara"}. Mientras tanto, mira las cifras de la hinchada.
        </p>
      )}
      <Link className="cv-link cv-block-link" href={`/estadisticas/${clubId}`}>
        Ver las estadísticas de la hinchada ›
      </Link>
    </section>
  );
}
