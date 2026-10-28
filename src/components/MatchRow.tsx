import { outcomeFor } from "@/lib/domain/stats.ts";
import { scorersLine } from "@/lib/domain/scorers.ts";
import type { Goal, Match } from "@/lib/domain/types.ts";
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

function GoalsLine({ match, goals }: { match: Match; goals: Goal[] }) {
  const home = scorersLine(goals, match.homeTeamId);
  const away = scorersLine(goals, match.awayTeamId);
  return (
    <span className="match-goals">
      {home && (
        <span>
          <span aria-hidden>⚽ </span>
          {match.homeTeamName}: {home}
        </span>
      )}
      {away && (
        <span>
          <span aria-hidden>⚽ </span>
          {match.awayTeamName}: {away}
        </span>
      )}
    </span>
  );
}

/** Fila de partido con marcador tipo tablero; si se indica `highlight` (club del hincha), se colorea por resultado. */
export function MatchRow({
  match,
  children,
  highlight,
  goals,
}: {
  match: Match;
  children?: React.ReactNode;
  highlight?: string;
  goals?: Goal[];
}) {
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
        {goals && goals.length > 0 && <GoalsLine match={match} goals={goals} />}
      </div>
      <div>{children}</div>
    </div>
  );
}
