import type { Suma } from "@/lib/domain/suma.ts";
import type { Team } from "@/lib/repo/teams.ts";

const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v)}%`);

/** Resumen de los dos clubes del hincha: el total y cada club por separado. */
export function SumaView({ username, main, second, suma }: { username: string; main: Team; second: Team; suma: Suma }) {
  const names = new Map([[main.id, main.name], [second.id, second.name]]);
  const g = (n: number) => `${n} ${n === 1 ? "gol" : "goles"}`;
  return (
    <div className="stack">
      <section className="card stack">
        <h2 className="section-title" style={{ margin: 0 }}>
          @{username}: {main.shortName} + {second.shortName}
        </h2>
        <div className="grid grid-4">
          <div className="card stat">
            <span className="stat-value">{suma.total}</span>
            <span className="stat-label">partidos en total</span>
          </div>
          <div className="card stat">
            <span className="stat-value">
              {suma.record.won}-{suma.record.drawn}-{suma.record.lost}
            </span>
            <span className="stat-label">ganados · empates · perdidos</span>
          </div>
          <div className="card stat">
            <span className="stat-value">{pct(suma.effectiveness)}</span>
            <span className="stat-label">efectividad cuando vas</span>
          </div>
          <div className="card stat">
            <span className="stat-value" style={{ fontSize: "1.6rem" }}>{suma.verdict.label}</span>
            <span className="stat-label">veredicto del Mufómetro</span>
          </div>
        </div>
        <p className="muted small" style={{ margin: 0 }}>
          Un partido entre tus dos clubes cuenta una sola vez.
        </p>
      </section>
      <section className="grid grid-2">
        {suma.clubs.map((c) => (
          <div key={c.clubId} className="card stack">
            <h3 style={{ margin: 0 }}>{names.get(c.clubId)}</h3>
            <p style={{ margin: 0 }}>
              <strong>{c.total}</strong> {c.total === 1 ? "partido" : "partidos"} ·{" "}
              <strong>
                {c.record.won}-{c.record.drawn}-{c.record.lost}
              </strong>{" "}
              · efectividad <strong>{pct(c.effectiveness)}</strong>
            </p>
            {c.idol ? (
              <p className="muted" style={{ margin: 0 }}>
                Ídolo visto: {c.idol.player} ({g(c.idol.goals)})
              </p>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
