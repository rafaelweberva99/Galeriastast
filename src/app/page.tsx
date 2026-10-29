import Link from "next/link";
import { currentUser } from "@/lib/auth.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { datasetSummary } from "@/lib/repo/matches.ts";
import { clubsByFans } from "@/lib/repo/rankings.ts";
import { getTeam, listClubs } from "@/lib/repo/teams.ts";
import { CURRENT_SEASON } from "@/lib/ticketing.ts";
import { isVisibleClub, MVP_ACTIVE, MVP_CLUBS, visibleClubs } from "@/lib/mvp.ts";
import { Jersey } from "@/components/Jersey.tsx";

const BIG_THREE = ["colo-colo", "universidad-de-chile", "universidad-catolica"];

const FEATURES = [
  { n: "01", title: "Mufómetro", text: "Tu efectividad en los partidos que viste desde la galería. Más de 60%: cábala. Menos de 40%: yeta." },
  { n: "02", title: "Clásicos", text: "Superclásico, Clásico Universitario, albos contra cruzados… ¿cómo le va a tu club cuando tú vas?" },
  { n: "03", title: "Finales", text: "Las finales a las que fuiste, con penales incluidos. ¿Viste dar la vuelta o te tocó llorar?" },
  { n: "04", title: "Modo Infiltrado", text: "¿Fuiste escondido a la galería rival? También cuenta, y lo separamos aparte." },
  { n: "05", title: "Impacto real", text: "Comparamos tu efectividad con la de tu club en esas mismas temporadas: ¿sumas o restas?" },
  { n: "06", title: "Importa tus entradas", text: "Sube una captura de tus compras en PuntoTicket y marcamos tus partidos solos." },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ cuenta?: string }> }) {
  const { cuenta } = await searchParams;
  const db = await getDb();
  const [user, summary, clubs] = [await currentUser(), await datasetSummary(db), (await clubsByFans(db)).filter((c) => isVisibleClub(c.clubId)).slice(0, 5)];
  const allClubs = visibleClubs(await listClubs(db));
  // Tarjetas grandes: los grandes habilitados (o, si ninguno lo está, los clubes del MVP).
  const bigVisible = BIG_THREE.filter(isVisibleClub);
  const featured = bigVisible.length ? bigVisible : [...MVP_CLUBS];
  const latest = CURRENT_SEASON;
  const current = allClubs.filter((c) => c.current && !featured.includes(c.id));
  const historic = allClubs.filter((c) => !c.current);
  const big = (await Promise.all(featured.map((id) => getTeam(db, id))))
    .filter((t) => t !== null)
    .map(clubIdentity);

  return (
    <>
      {cuenta === "eliminada" && !user && (
        <p className="notice success" role="status" style={{ marginBottom: 48 }}>
          Tu cuenta fue eliminada junto con tus partidos marcados, tus consentimientos y tus sesiones. Gracias por
          haber sido parte de GaluchaStats.
        </p>
      )}
      <section className="pitch bleed hero">
        <div className="container">
          <p className="display" style={{ fontSize: "1.1rem", letterSpacing: "0.2em", opacity: 0.9, margin: 0 }}>
            Carnet de hincha · Fútbol chileno
          </p>
          <h1>¿Eres cábala o yeta?</h1>
          <p className="lead">
            Marca los partidos a los que fuiste al estadio y descubre si tu club gana más cuando estás en la galería.
            Con {summary.matches.toLocaleString("es-CL")} partidos reales desde {summary.firstSeason ?? "2000"}.
          </p>

          {user ? (
            <div className="row" style={{ marginTop: 24 }}>
              <Link className="btn btn-light" href="/carnet">
                Ver mi carnet
              </Link>
              <Link
                className="btn btn-light"
                href="/partidos"
                style={{ background: "transparent", color: "#fff", borderColor: "rgb(255 255 255 / 0.6)" }}
              >
                Marcar partidos
              </Link>
            </div>
          ) : (
            <>
              <div className="pick-club">
                {big.map((c) => (
                  <Link
                    key={c.id}
                    href={`/registro?club=${c.id}`}
                    className="pick-card"
                    style={clubStyle(c) as React.CSSProperties}
                  >
                    <Jersey club={c} size={64} number="12" />
                    <div>
                      <div className="small" style={{ opacity: 0.85 }}>
                        Soy
                      </div>
                      <p className="display">{c.nickname}</p>
                      <div className="small" style={{ opacity: 0.85 }}>
                        {c.short}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {current.length > 0 && (
                <p className="display" style={{ margin: "26px 0 10px", fontSize: "1rem", letterSpacing: "0.12em" }}>
                  Todos los clubes de Primera {latest}
                </p>
              )}
              <div className="club-chips">
                {current.map((t) => {
                  const c = clubIdentity(t);
                  return (
                    <Link
                      key={t.id}
                      href={`/registro?club=${t.id}`}
                      className="club-chip"
                      style={clubStyle(c) as React.CSSProperties}
                      title={`Soy hincha de ${t.name}`}
                    >
                      <Jersey club={c} size={40} />
                      <span>
                        <strong>{t.shortName}</strong>
                        <small>{c.fansPlural ?? c.alias ?? ""}</small>
                      </span>
                    </Link>
                  );
                })}
              </div>
              {MVP_ACTIVE && (
                <p className="small" style={{ marginTop: 14, opacity: 0.9 }}>
                  Partimos con los clubes cuyo historial en Primera ya está completo y verificado. El resto de los
                  clubes llega pronto.
                </p>
              )}
              {historic.length > 0 && (
                <p className="small" style={{ marginTop: 14, opacity: 0.9 }}>
                  ¿Tu club jugó en Primera antes? También está:{" "}
                  {historic.map((t, i) => (
                    <span key={t.id}>
                      {i > 0 && " · "}
                      <Link href={`/registro?club=${t.id}`} style={{ color: "#fff" }}>
                        {t.shortName}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section className="grid grid-4 section">
        <div className="card stat">
          <span className="stat-value">{summary.matches.toLocaleString("es-CL")}</span>
          <span className="stat-label">partidos históricos</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{summary.teams}</span>
          <span className="stat-label">clubes de Primera División</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{summary.competitions}</span>
          <span className="stat-label">competiciones</span>
        </div>
        <div className="card stat">
          <span className="stat-value">
            {summary.firstSeason ?? "—"}–{summary.lastSeason ?? "—"}
          </span>
          <span className="stat-label">temporadas</span>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Cómo funciona</h2>
        <div className="grid grid-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <div className="display" style={{ color: "var(--accent)", fontSize: "1.6rem", marginBottom: 4 }}>
                {f.n}
              </div>
              <h3>{f.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {clubs.length > 0 && (
        <section className="section card">
          <h2 className="section-title">Las hinchadas que más marcan</h2>
          <ol>
            {clubs.map((c) => (
              <li key={c.clubId}>
                <Link href={`/rankings/${c.clubId}`}>{c.name}</Link>{" "}
                <span className="muted">
                  · {c.fans} {c.fans === 1 ? "hincha" : "hinchas"} · {c.attendances}{" "}
                  {c.attendances === 1 ? "partido marcado" : "partidos marcados"}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
