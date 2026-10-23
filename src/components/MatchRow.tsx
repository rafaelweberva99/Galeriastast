import type { Match } from "@/lib/domain/types.ts";
import { formatDate, scoreLine } from "./format.ts";

export function MatchRow({ match, children, highlight }: { match: Match; children?: React.ReactNode; highlight?: string }) {
  const name = (id: string, label: string) => (id === highlight ? <strong>{label}</strong> : label);
  return (
    <div className="match">
      <div className="match-date">{formatDate(match.date)}</div>
      <div className="match-teams">
        <span>{name(match.homeTeamId, match.homeTeamName)}</span>
        <span className="match-score">{scoreLine(match)}</span>
        <span>{name(match.awayTeamId, match.awayTeamName)}</span>
        <span className="match-meta">
          {match.competitionName}
          {match.tournament ? ` · ${match.tournament}` : ""}
          {match.stage ? ` · ${match.stage}` : ""}
          {match.isFinal ? " · 🏆 Final" : ""}
        </span>
      </div>
      <div>{children}</div>
    </div>
  );
}
