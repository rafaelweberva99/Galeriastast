import { goalsOf, type GoalCoverage, type MatchPhase } from "@/lib/domain/matchPage.ts";
import type { Goal, Match } from "@/lib/domain/types.ts";

function GoalList({ goals }: { goals: Goal[] }) {
  return (
    <ul className="mp-goals-list">
      {goals.map((g, i) => (
        <li key={i}>
          <span className="mp-min">{g.minute !== null ? `${g.minute}'` : "—"}</span>
          <span>
            {g.player}
            {g.penalty && <em> (penal)</em>}
            {g.ownGoal && <em> (autogol)</em>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function GoalsSection({
  match: m,
  goals,
  coverage,
  phase,
}: {
  match: Match;
  goals: Goal[];
  coverage: GoalCoverage;
  phase: MatchPhase;
}) {
  if (phase === "suspendido" || phase === "pendiente") return null;
  const total = (m.homeGoals ?? 0) + (m.awayGoals ?? 0);
  return (
    <section className="card">
      <h2 className="section-title">Goles</h2>
      {total === 0 && m.homeGoals !== null ? (
        <p className="muted">Sin goles: se fueron en blanco.</p>
      ) : coverage === "ninguna" ? (
        <p className="muted">Aún no tenemos los goleadores de este partido.</p>
      ) : (
        <>
          <div className="mp-goals">
            {[
              [m.homeTeamName, m.homeTeamId],
              [m.awayTeamName, m.awayTeamId],
            ].map(([name, id]) => {
              const list = goalsOf(goals, id);
              return (
                <div key={id}>
                  <h3 className="mp-goals-team">{name}</h3>
                  {list.length ? <GoalList goals={list} /> : <p className="muted small">Sin goles.</p>}
                </div>
              );
            })}
          </div>
          {coverage === "parcial" && (
            <p className="muted small">La lista está incompleta: aún faltan goleadores de este partido.</p>
          )}
        </>
      )}
    </section>
  );
}
