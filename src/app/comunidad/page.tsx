import Link from "next/link";
import { getDb } from "@/lib/db/client.ts";
import { visibleClubs } from "@/lib/mvp.ts";
import { biggestScores, primeraRecords, topFans, topScorers } from "@/lib/repo/liga.ts";
import { listClubs, SELECCION_ID } from "@/lib/repo/teams.ts";
import { ClubBadge } from "@/components/ClubBadge.tsx";
import type { Streak } from "@/lib/domain/records.ts";

export const metadata = {
  title: "Datos de la liga · GaluchaStats",
  description: "Récords, rachas, goleadores y goleadas de la Primera División chilena y de La Roja, con más de 10.000 partidos.",
};

const range = (s: Streak) => {
  if (!s.from || !s.to) return "";
  const a = s.from.slice(0, 4);
  const b = s.to.slice(0, 4);
  return a === b ? a : `${a}–${b}`;
};
const fmtDate = (iso: string) => new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="muted small" style={{ textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontFamily: "var(--font-display, inherit)", fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.1 }}>{value}</div>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

/** Datos de la liga: valor desde el primer día, sin depender de cuántos hinchas haya. */
export default async function ComunidadPage() {
  const db = await getDb();
  const clubs = visibleClubs(await listClubs(db));
  const [scorers, rojaScorers, bigs, fans] = await Promise.all([
    topScorers(db, { limit: 10 }),
    topScorers(db, { limit: 5, teamId: SELECCION_ID }),
    biggestScores(db, 5),
    topFans(db, 5),
  ]);
  const records = await Promise.all(clubs.map(async (c) => [c.id, await primeraRecords(db, c.id)] as const));
  const rec = new Map(records);

  return (
    <div className="stack">
      <div>
        <h1 className="section-title">Datos de la liga</h1>
        <p className="muted">
          Récords, rachas y goleadores de la Primera División (desde 1997) y de La Roja. Los goleadores cuentan los partidos con goles
          cargados, que son casi todos desde 2001.
        </p>
      </div>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Máximos goleadores de la liga</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Jugador</th>
                <th>Clubes</th>
                <th className="num">Goles</th>
              </tr>
            </thead>
            <tbody>
              {scorers.map((s, i) => (
                <tr key={s.player}>
                  <td>{i + 1}</td>
                  <td>
                    <strong>{s.player}</strong>
                  </td>
                  <td className="muted">{s.clubs.join(" · ")}</td>
                  <td className="num">{s.goals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="stack">
        <div>
          <h2 style={{ margin: 0 }}>Los récords de cada club</h2>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            En Primera División. Toca un club para ver su historial completo.
          </p>
        </div>
        <div className="grid grid-3">
          {clubs.map((c) => {
            const r = rec.get(c.id)!;
            return (
              <Link key={c.id} href={`/clubes/${c.id}`} className="card stack" style={{ textDecoration: "none", borderTop: `5px solid ${c.colorPrimary}`, gap: 10 }}>
                <div className="row">
                  <ClubBadge team={c} size={36} />
                  <strong style={{ fontSize: "1.1rem" }}>{c.name}</strong>
                </div>
                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Stat label="Racha invicta" value={`${r.unbeaten.length}`} sub={`partidos · ${range(r.unbeaten)}`} />
                  <Stat label="Victorias seguidas" value={`${r.wins.length}`} sub={range(r.wins)} />
                  <Stat label="Valla invicta" value={`${r.cleanSheets.length}`} sub={`sin recibir gol · ${range(r.cleanSheets)}`} />
                  <Stat
                    label="Mayor goleada"
                    value={r.biggestWin ? `${r.biggestWin.goalsFor}–${r.biggestWin.goalsAgainst}` : "—"}
                    sub={r.biggestWin ? `a ${r.biggestWin.rival} · ${r.biggestWin.date.slice(0, 4)}` : undefined}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid grid-2">
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Mayores goleadas de la liga</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {bigs.map((b) => (
              <li key={`${b.date}${b.home}`} style={{ margin: "6px 0" }}>
                <strong>
                  {b.home} {b.homeGoals}–{b.awayGoals} {b.away}
                </strong>
                <div className="muted small">
                  {fmtDate(b.date)}
                  {b.tournament ? ` · ${b.tournament}` : ""}
                </div>
              </li>
            ))}
          </ol>
        </section>
        <section className="card stack" style={{ background: "linear-gradient(135deg, #8f1a12 0%, #d52b1e 55%, #0033a0 100%)", color: "#fff", border: 0 }}>
          <h2 style={{ margin: 0 }}>★ La Roja: máximos goleadores</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {rojaScorers.map((s) => (
              <li key={s.player} style={{ margin: "6px 0" }}>
                <strong>{s.player}</strong> · {s.goals} goles
              </li>
            ))}
          </ol>
          <Link href="/clubes/seleccion-chilena" style={{ color: "#fff", fontWeight: 700 }}>
            Ver historial de La Roja →
          </Link>
        </section>
      </div>

      <section className="card stack">
        <h2 style={{ margin: 0 }}>Los hinchas que más van a la cancha</h2>
        {fans.length === 0 ? (
          <p className="muted">Aún no hay hinchas con partidos marcados. ¡Sé el primero!</p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {fans.map((f) => (
              <li key={f.username} style={{ margin: "6px 0" }}>
                <Link href={`/hincha/${f.username}`}>@{f.username}</Link> · {f.clubName} · <strong>{f.attended}</strong> {f.attended === 1 ? "partido" : "partidos"}
              </li>
            ))}
          </ol>
        )}
        <Link href="/rankings">Ver el ranking por club →</Link>
      </section>
    </div>
  );
}
