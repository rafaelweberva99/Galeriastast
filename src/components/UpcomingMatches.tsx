import { clubIdentity } from "@/lib/clubTheme.ts";
import type { Match } from "@/lib/domain/types.ts";
import type { Team } from "@/lib/repo/teams.ts";
import { clubTicketing } from "@/lib/ticketing.ts";
import { formatDate } from "./format.ts";
import { Jersey } from "./Jersey.tsx";

/** Próximos partidos del club, con enlace a la ticketera del local (quien vende ese partido). */
export function UpcomingMatches({ matches, clubId, clubs }: { matches: Match[]; clubId: string; clubs: Team[] }) {
  if (!matches.length) return null;
  const teams = new Map(clubs.map((t) => [t.id, t]));
  return (
    <section className="card">
      <h2 className="section-title">Próximos partidos</h2>
      {matches.map((m) => {
        const home = m.homeTeamId === clubId;
        const rivalId = home ? m.awayTeamId : m.homeTeamId;
        const rival = teams.get(rivalId);
        const sale = clubTicketing(m.homeTeamId);
        return (
          <div key={m.id} className="match upcoming">
            <div className="match-date">{formatDate(m.date)}</div>
            <div className="match-teams">
              {rival && <Jersey club={clubIdentity(rival)} size={28} />}
              <span>
                <strong>{home ? "vs" : "en"}</strong> {home ? m.awayTeamName : m.homeTeamName}
              </span>
              <span className="match-meta">
                {[m.competitionName, m.stage, m.venueName].filter(Boolean).join(" · ")}
                {m.isFinal ? " · 🏆 Final" : ""}
              </span>
            </div>
            <div>
              {sale?.buyUrl ? (
                <a className="btn btn-ghost small" href={sale.buyUrl} target="_blank" rel="noopener noreferrer">
                  Entradas{sale.provider ? ` · ${sale.provider.name}` : ""} ↗
                </a>
              ) : (
                <span className="muted small">Venta del club local</span>
              )}
            </div>
          </div>
        );
      })}
      <p className="muted small" style={{ marginTop: 10 }}>
        Las fechas pueden cambiar: la ANFP programa fecha a fecha. Cada partido lo vende el club local.
      </p>
    </section>
  );
}
