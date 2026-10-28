import { getDb } from "@/lib/db/client.ts";
import { runQualityChecks } from "@/lib/ingest/quality.ts";
import { datasetSummary } from "@/lib/repo/matches.ts";
import { pct } from "@/components/format.ts";

export const metadata = { title: "Fuentes y calidad de datos · GaleríaStats" };

type Row = { competition: string; first: number; last: number; n: number };

export default async function DataPage() {
  const db = await getDb();
  const summary = await datasetSummary(db);
  const coverage = await db.all<Row>(
    `SELECT c.name AS competition, MIN(m.season) AS first, MAX(m.season) AS last, COUNT(*) AS n
     FROM matches m JOIN competitions c ON c.id = m.competition_id GROUP BY c.id ORDER BY c.tier`,
  );
  const issues = await runQualityChecks(db);
  return (
    <div className="stack">
      <h1>Fuentes y calidad de datos</h1>
      <section className="card">
        <h2>Fuente</h2>
        <p>
          Resultados históricos de{" "}
          <a href="https://www.worldfootball.net" rel="noreferrer">
            worldfootball.net
          </a>
          , obtenidos desde el espejo en formato Football.TXT{" "}
          <a href="https://github.com/yorobot/cache.wfb.txt" rel="noreferrer">
            yorobot/cache.wfb.txt
          </a>
          . {summary.matches.toLocaleString("es-CL")} partidos; {pct(summary.verifiedPct, 1)} confirmados con una
          segunda fuente independiente.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Competición</th>
                <th className="num">Desde</th>
                <th className="num">Hasta</th>
                <th className="num">Partidos</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map((c) => (
                <tr key={c.competition}>
                  <td>{c.competition}</td>
                  <td className="num">{c.first}</td>
                  <td className="num">{c.last}</td>
                  <td className="num">{c.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h2>Chequeos automáticos</h2>
        {issues.length === 0 ? (
          <p>Sin problemas detectados.</p>
        ) : (
          <ul>
            {issues.map((i, k) => (
              <li key={k}>
                <span className={`pill ${i.severity === "error" ? "P" : "E"}`}>{i.check}</span> {i.detail}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
