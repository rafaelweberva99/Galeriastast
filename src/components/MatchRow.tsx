import { outcomeFor } from "@/lib/domain/stats.ts";
import type { Match } from "@/lib/domain/types.ts";
import { formatDate } from "./format.ts";

function Score({ match: m }: { match: Match }) {
  if (m.homeGoals === null || m.awayGoals === null) {
    return <span className="scoreboard">{m.homePens !== null ? `${m.homePens}-${m.awayPens} pen.` : "vs"}</span>;
  }
  return (
    <span className="scoreboard">
      {m.homeGoals}
      <small>-</small>
      {m.awayGoals}
      {m.homePens !== null && (
        <small>
          ({m.homePens}-{m.awayPens} pen.)
        </small>
      )}
    </span>
  );
}

/** Fila de partido con marcador tipo tablero; si se indica `highlight` (club del hincha), se colorea por resultado. */
export function MatchRow({ match, children, highlight }: { match: Match; children?: React.ReactNode; highlight?: string }) {
  const name = (id: string, label: string) => (id === highlight ? <strong>{label}</strong> : <span>{label}</span>);
  const outcome = highlight ? outcomeFor(match, highlight) : null;
  return (
    <div className={`match ${outcome ?? ""}`}>
      <div className="match-date">{formatDate(match.date)}</div>
      <div className="match-teams">
        {name(match.homeTeamId, match.homeTeamName)}
        <Score match={match} />
        {name(match.awayTeamId, match.awayTeamName)}
        <span className="match-meta">
          {match.competitionName}
          {match.tournament ? ` · ${match.tournament}` : ""}
          {match.stage ? ` · ${match.stage}` : ""}
          {match.isFinal && <span className="match-final"> · 🏆 Final</span>}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}
