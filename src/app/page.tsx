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
import { LandingShowcase } from "@/components/LandingShowcase.tsx";
import { LandingPreview } from "@/components/LandingPreview.tsx";
import { CountUp } from "@/components/CountUp.tsx";
import { Reveal } from "@/components/Reveal.tsx";
import { Ball } from "@/components/Ball.tsx";

const BIG_THREE = ["colo-colo", "universidad-de-chile", "universidad-catolica"];


export default async function Home({ searchParams }: { searchParams: Promise<{ cuenta?: string }> }) {
  const { cuenta } = await searchParams;
  const db = await getDb();
  const [user, summary, clubs] = [await currentUser(), await datasetSummary(db), (await clubsByFans(db)).filter((c) => isVisibleClub(c.clubId)).slice(0, 5)];
  const everyClub = await listClubs(db);
  const allClubs = visibleClubs(everyClub);
  // Aviso de "pronto más clubes" solo mientras algún club de Primera siga oculto.
  const someHidden = everyClub.some((c) => c.current && !isVisibleClub(c.id));
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
        {/* Fondo vivo: focos de luz, polvo de cancha y un balón que rueda. Todo decorativo. */}
        <div className="hero-fx" aria-hidden="true">
          <span className="hero-beam hero-beam-a" />
          <span className="hero-beam hero-beam-b" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <span key={i} className="hero-dust" style={{ "--k": i } as React.CSSProperties} />
          ))}
          <span className="hero-roll">
            <span className="hero-roll-ball">
              <Ball size={34} />
            </span>
          </span>
        </div>
        <div className="container hero-grid">
          <div className="hero-copy">
            <p className="display hero-kicker">Carnet de hincha · Fútbol chileno</p>
            <h1>
              ¿Eres <em className="hl">cábala</em> o <em className="hl hl-2">yeta</em>?
            </h1>
            <p className="lead">
              Marca los partidos a los que fuiste al estadio y recibe tu carnet con el Mufómetro, tus goleadores, tus
              clásicos y tu resumen del año. Con {summary.matches.toLocaleString("es-CL")} partidos reales desde{" "}
              {summary.firstSeason ?? "1997"}.
            </p>
            {!user && (
              <div className="row" style={{ marginTop: 22 }}>
                <a className="btn btn-light" href="#elige-tu-club">Crear mi carnet gratis</a>
                <a className="btn hero-ghost" href="#que-veras">Ver qué incluye</a>
              </div>
            )}
            <ul className="hero-proof">
              <li><b><CountUp value={summary.matches} /></b> partidos</li>
              <li><b><CountUp value={summary.teams} duration={1000} /></b> clubes</li>
              <li><b>+<CountUp value={8000} /></b> con goleadores</li>
            </ul>
          </div>
          <LandingPreview />
        </div>
      </section>

      {allClubs.length > 3 && (
        <div className="marquee bleed" aria-label="Clubes del fútbol chileno">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <ul key={copy} className="marquee-set" aria-hidden={copy === 1 ? true : undefined}>
                {allClubs.map((t) => {
                  const c = clubIdentity(t);
                  return (
                    <li key={t.id}>
                      <Link
                        href={user ? `/clubes/${t.id}` : `/registro?club=${t.id}`}
                        className="marquee-item"
                        style={clubStyle(c) as React.CSSProperties}
                        tabIndex={copy === 1 ? -1 : undefined}
                      >
                        <Jersey club={c} size={34} />
                        <span>{t.shortName}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ))}
          </div>
        </div>
      )}

      <section className="pitch bleed pick-section" id="elige-tu-club">
        <div className="container">
          <h2 className="display pick-title">{user ? "Sigue con tu carnet" : "Elige tu club y parte"}</h2>
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
              {MVP_ACTIVE && someHidden && (
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

      <LandingShowcase />

      <section className="section steps">
        <Reveal>
          <p className="lp-eyebrow">Así de simple</p>
          <h2 className="lp-h2">Tu carnet en tres pasos</h2>
        </Reveal>
        <ol className="steps-list">
          <li><span>1</span><div><h3>Elige tu club</h3><p className="muted">Crea tu cuenta en un minuto y el sitio se viste con los colores de tu equipo.</p></div></li>
          <li><span>2</span><div><h3>Marca tus partidos</h3><p className="muted">A mano, o sube una captura de tus entradas de PuntoTicket y los marcamos solos.</p></div></li>
          <li><span>3</span><div><h3>Descubre tu carnet</h3><p className="muted">Mufómetro, ídolos y verdugos, derrotas históricas, gráficos y tu resumen anual para compartir.</p></div></li>
        </ol>
      </section>

      <section className="grid grid-4 section">
        <div className="card stat">
          <span className="stat-value"><CountUp value={summary.matches} /></span>
          <span className="stat-label">partidos históricos</span>
        </div>
        <div className="card stat">
          <span className="stat-value"><CountUp value={summary.teams} /></span>
          <span className="stat-label">clubes de Primera División</span>
        </div>
        <div className="card stat">
          <span className="stat-value"><CountUp value={summary.competitions} /></span>
          <span className="stat-label">competiciones</span>
        </div>
        <div className="card stat">
          <span className="stat-value">
            {summary.firstSeason ?? "—"}–{summary.lastSeason ?? "—"}
          </span>
          <span className="stat-label">temporadas</span>
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

      {!user && (
        <section className="pitch bleed final-cta">
          <div className="container">
            <h2>¿Cábala o yeta? Descúbrelo hoy</h2>
            <p className="lead">Es gratis y toma un minuto. Solo para entretención.</p>
            <a className="btn btn-light" href="#elige-tu-club">Crear mi carnet</a>
          </div>
        </section>
      )}
    </>
  );
}
