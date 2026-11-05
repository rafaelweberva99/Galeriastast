import type { ClubIdentity } from "@/lib/clubTheme.ts";
import { countdownText, daysUntil, type MatchPhase } from "@/lib/domain/matchPage.ts";
import type { Match } from "@/lib/domain/types.ts";
import type { Team } from "@/lib/repo/teams.ts";
import { clubTicketing } from "@/lib/ticketing.ts";
import { formatDate } from "../format.ts";
import { Jersey } from "../Jersey.tsx";

interface Side {
  team: Team;
  identity: ClubIdentity;
}

function TeamBlock({ side, number }: { side: Side; number?: string }) {
  return (
    <div className="mp-team">
      <Jersey club={side.identity} size={72} number={number} />
      <span className="mp-team-name">{side.team.shortName}</span>
    </div>
  );
}

/** Cabecera: camisetas, marcador grande y datos del partido (o cuenta regresiva si es futuro). */
export function MatchHeader({
  match: m,
  phase,
  today,
  home,
  away,
  rivalry,
}: {
  match: Match;
  phase: MatchPhase;
  today: string;
  home: Side;
  away: Side;
  rivalry: string | null;
}) {
  const sale = phase === "futuro" ? clubTicketing(m.homeTeamId) : null;
  // El torneo a veces repite la competición ("Copa Sudamericana 2025"): no se muestra dos veces.
  const tournament = m.tournament && !m.tournament.startsWith(m.competitionName) ? m.tournament : null;
  const meta = [m.competitionName, tournament, m.stage, m.venueName].filter(Boolean).join(" · ");
  return (
    <header className="card mp-head">
      <div className="mp-kicker">
        {phase === "futuro" ? "Próximo partido" : formatDate(m.date)}
        {m.isFinal && <span className="match-final"> · 🏆 Final</span>}
        {rivalry && <span className="mp-clasico"> · {rivalry}</span>}
      </div>
      <h1 className="sr-only">
        {home.team.name} vs {away.team.name}
      </h1>
      <div className="mp-versus">
        <TeamBlock side={home} />
        <div className="mp-score" aria-label={phase === "jugado" ? `Resultado ${m.homeGoals} a ${m.awayGoals}` : undefined}>
          {phase === "jugado" && m.homeGoals !== null ? (
            <>
              <span className="scoreboard mp-board">
                {m.homeGoals}
                <small>-</small>
                {m.awayGoals}
              </span>
              {m.homePens !== null && (
                <span className="mp-pens">
                  Penales {m.homePens}-{m.awayPens}
                </span>
              )}
            </>
          ) : phase === "jugado" ? (
            <span className="scoreboard mp-board">
              {m.homePens}
              <small>-</small>
              {m.awayPens}
            </span>
          ) : (
            <span className="scoreboard mp-board mp-vs">vs</span>
          )}
        </div>
        <TeamBlock side={away} />
      </div>
      <p className="mp-meta">{meta}</p>
      {phase === "futuro" && (
        <div className="mp-next">
          <strong>
            {formatDate(m.date)} · {countdownText(daysUntil(m.date, today))}
          </strong>
          {sale?.buyUrl ? (
            <a className="btn btn-ghost small" href={sale.buyUrl} target="_blank" rel="noopener noreferrer">
              Entradas{sale.provider ? ` · ${sale.provider.name}` : ""} ↗
            </a>
          ) : (
            <span className="muted small">Entradas: las vende el club local.</span>
          )}
          <span className="muted small">Las fechas pueden cambiar: la ANFP programa fecha a fecha.</span>
        </div>
      )}
      {phase === "suspendido" && (
        <p className="mp-susp">
          Suspendido: cuenta como asistencia, no para el Mufómetro. Si fuiste, márcalo igual.
        </p>
      )}
    </header>
  );
}
