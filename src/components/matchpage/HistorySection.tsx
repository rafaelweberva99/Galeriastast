import Link from "next/link";
import type { HeadToHead } from "@/lib/domain/matchPage.ts";
import { formatDate } from "../format.ts";

const LABEL = { G: "Ganó", E: "Empate", P: "Perdió" } as const;

/** Últimos enfrentamientos y balance G-E-P entre los dos equipos (desde la óptica del local de este partido). */
export function HistorySection({
  h2h,
  homeId,
  homeName,
  awayName,
  names,
  rivalry,
}: {
  h2h: HeadToHead;
  homeId: string;
  homeName: string;
  awayName: string;
  names: Map<string, string>;
  rivalry: string | null;
}) {
  return (
    <section className="card">
      <h2 className="section-title">Historia entre ambos</h2>
      {rivalry && (
        <p className="mp-clasico-note">
          <strong>{rivalry}</strong>: un clásico del fútbol chileno.
        </p>
      )}
      {h2h.played === 0 ? (
        <p className="muted">No tenemos otros partidos entre {homeName} y {awayName} en la base.</p>
      ) : (
        <>
          <p className="mp-big">
            En {h2h.played} {h2h.played === 1 ? "partido registrado" : "partidos registrados"}, {homeName} suma{" "}
            <strong>{h2h.won}G {h2h.drawn}E {h2h.lost}P</strong> ({h2h.goalsFor}-{h2h.goalsAgainst} en goles) contra {awayName}.
          </p>
          <h3 className="cv-sub">Últimos {h2h.last.length === 1 ? "enfrentamiento" : `${h2h.last.length} enfrentamientos`}</h3>
          <ul className="mp-h2h">
            {h2h.last.map((m) => (
              <li key={m.id} className={m.outcome}>
                <Link href={`/partidos/${m.id}`} className="mp-h2h-date">
                  {formatDate(m.date)}
                </Link>
                <span className="mp-h2h-teams">
                  {names.get(m.homeTeamId) ?? m.homeTeamId} <strong>{m.homeGoals}-{m.awayGoals}</strong>{" "}
                  {names.get(m.awayTeamId) ?? m.awayTeamId}
                  {m.homePens !== null && ` (${m.homePens}-${m.awayPens} pen.)`}
                </span>
                <span className="mp-h2h-res" title={`Visto desde ${homeName}`}>
                  {LABEL[m.outcome]} {homeName}
                </span>
                <span className="muted small mp-h2h-comp">{m.competitionName}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
