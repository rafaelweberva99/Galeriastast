import { Paged } from "./Paged.tsx";
import { AttendanceToggle } from "./AttendanceToggle.tsx";
import Link from "next/link";
import type { Carnet } from "@/lib/domain/stats.ts";
import { involves, outcomeFor } from "@/lib/domain/stats.ts";
import type { ScorersReport } from "@/lib/domain/scorers.ts";
import type { AttendedMatch, Goal } from "@/lib/domain/types.ts";
import type { Insights } from "@/lib/domain/insights/types.ts";
import type { CommunityComparison } from "@/lib/domain/community.ts";
import { yearsWithMatches } from "@/lib/domain/resumen.ts";
import { CommunityCard } from "./carnet/CommunityCard.tsx";
import { CompararBox } from "./comparar/CompararBox.tsx";
import type { Team } from "@/lib/repo/teams.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { scoreLine } from "./format.ts";
import { MatchRow } from "./MatchRow.tsx";
import { ScorersSection } from "./ScorersSection.tsx";
import { Centenario } from "./Centenario.tsx";
import { Premios } from "./Premios.tsx";
import type { Achievements } from "@/lib/domain/achievements.ts";
import { ShareCarnet } from "./ShareCarnet.tsx";
import { shareText } from "@/lib/shareText.ts";
import { siteUrl } from "@/lib/site.ts";
import { CarnetTabs } from "./carnet/CarnetTabs.tsx";
import { Hero } from "./carnet/Hero.tsx";
import { Highlights } from "./carnet/Highlights.tsx";
import { LogrosStrip } from "./carnet/LogrosStrip.tsx";
import { MatchList, type MatchItem } from "./carnet/MatchList.tsx";
import { GoalsPanel, MissedPanel, Memorable, RecordsPanel, PHASE_LABEL, eff01, MONTHS_LETTER, MONTHS_SHORT, WEEKDAYS_FULL, WEEKDAYS_SHORT } from "./carnet/StatsPanels.tsx";
import { ColumnChart, Donut, FormCurve, RecordRows, RivalBars, ResultStrip, SeasonBars } from "./carnet/charts/index.ts";

const OUTCOME_LABEL = { G: "Ganado", E: "Empate", P: "Perdido" } as const;

function Card({ title, hint, children, id }: { title: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="card cv-card" id={id}>
      <h2 className="section-title cv-card-title">{title}</h2>
      {hint && <p className="muted small cv-card-hint">{hint}</p>}
      {children}
    </section>
  );
}

export function CarnetView({
  username,
  memberId,
  club,
  carnet,
  attended,
  scorers,
  goals,
  clubs,
  isOwner,
  achievements,
  upcoming = [],
  isPublic = false,
  insights,
  community = null,
  secondClubId = null,
  national = false,
}: {
  username: string;
  memberId: number;
  club: Team;
  carnet: Carnet;
  attended: AttendedMatch[];
  scorers: ScorersReport;
  goals: Map<string, Goal[]>;
  clubs: Team[];
  isOwner: boolean;
  achievements: Achievements;
  /** Partidos marcados que todavía no se juegan ("Voy"). */
  upcoming?: AttendedMatch[];
  /** Si el carnet es público (para ofrecer compartir el link). */
  isPublic?: boolean;
  /** Estadísticas avanzadas (buildInsights). Mientras no estén conectadas se dibuja con una muestra. */
  insights: Insights;
  /** Comparación con los demás hinchas públicos del club (null si hay menos de 5). */
  community?: CommunityComparison | null;
  /** Segundo club del hincha: sus partidos se muestran con su propio resultado en la lista. */
  secondClubId?: string | null;
  /** Galería de la Selección: sin la camiseta de los 100 y con su propio link para compartir. */
  national?: boolean;
}) {
  const c = carnet;
  const id = clubIdentity(club);
  const ins = insights;
  const hasData = c.total > 0;

  // Resultado desde el club del hincha; si el partido es de su segundo club, desde ese club.
  const perspective = (m: AttendedMatch) => (!involves(m, club.id) && secondClubId && involves(m, secondClubId) ? secondClubId : club.id);
  const items: MatchItem[] = [...attended].reverse().map((m) => ({
    id: m.id,
    season: m.season,
    competition: m.competitionName,
    outcome: outcomeFor(m, perspective(m)),
    search: [m.homeTeamName, m.awayTeamName, m.competitionName, m.tournament, m.stage, m.season, ...(goals.get(m.id) ?? []).map((g) => g.player)].filter(Boolean).join(" "),
    node: (
      <MatchRow match={m} highlight={perspective(m)} goals={goals.get(m.id)}>
        {m.mode === "infiltrado" && <span className="pill infiltrado">Infiltrado</span>}
        {/* En tu propio carnet puedes corregir una marca equivocada sin salir de aquí ("No fui" lo quita). */}
        {isOwner && <AttendanceToggle matchId={m.id} initial={m.mode === "infiltrado" ? "infiltrado" : "propia"} />}
      </MatchRow>
    ),
  }));

  const upcomingCard = upcoming.length > 0 && (
    <section className="card cv-card">
      <h2 className="section-title cv-card-title">{isOwner ? "Próximos partidos a los que vas" : "Próximos partidos a los que va"}</h2>
      <p className="muted small cv-card-hint">Cuentan en el carnet y en el Mufómetro cuando se jueguen.</p>
      {upcoming.map((m) => (
        <MatchRow key={m.id} match={m} highlight={club.id}>
          {m.mode === "infiltrado" && <span className="pill infiltrado">Infiltrado</span>}
          {isOwner && <AttendanceToggle matchId={m.id} initial={m.mode === "infiltrado" ? "infiltrado" : "propia"} upcoming />}
        </MatchRow>
      ))}
    </section>
  );

  const resumen = (
    <>
      {upcomingCard}
      <Card title="Lo más destacado" hint="Lo que más se repite (o más sorprende) en los partidos que marcaste.">
        <Highlights highlights={ins.highlights} />
      </Card>
      <div className="grid cv-grid-2">
        <Card title="Curva de forma" hint="Cómo va tu efectividad partido a partido. Toca o desliza para ver cada uno.">
          <FormCurve points={ins.form} />
        </Card>
        <Card title="Últimos 20 resultados" hint="De izquierda a derecha, del más antiguo al más reciente.">
          <ResultStrip points={ins.form} last={20} />
          <div className="cv-legend cv-legend-results">
            <span><i className="cv-dot-key win" /> Ganado</span>
            <span><i className="cv-dot-key draw" /> Empate</span>
            <span><i className="cv-dot-key loss" /> Perdido</span>
          </div>
        </Card>
      </div>
      <Card title="Logros" hint="Niveles del carnet, camiseta de los 100, rueda completa y temporadas perfectas.">
        <LogrosStrip a={achievements} />
        <a className="cv-link cv-block-link" href="#logros">
          Ver todos los logros ›
        </a>
      </Card>
      <CommunityCard
        username={username}
        clubId={club.id}
        clubName={club.shortName}
        years={yearsWithMatches(attended, club.id)}
        comparison={community}
        owner={isOwner}
      />
      {isOwner && <CompararBox from={username} />}
      {isOwner && (
        <ShareCarnet
          username={username}
          isPublic={isPublic}
          text={shareText(c, id.short, national)}
          url={`${siteUrl()}/hincha/${encodeURIComponent(username)}${national ? "/seleccion" : ""}`}
          imagePath={national ? `/hincha/${encodeURIComponent(username)}/seleccion/tarjeta` : undefined}
          title={national ? "Comparte tu Galería de La Roja" : undefined}
          shareTitle={national ? "Mi Galería de La Roja" : undefined}
        />
      )}
    </>
  );

  const estadisticas = (
    <>
      <div className="grid cv-grid-2">
        <Card title="Por temporada" hint="Tu efectividad cada año frente a la del club en esa temporada.">
          <SeasonBars seasons={ins.seasons} />
        </Card>
        <Card title="Rivales" hint="Con quién eres cábala y con quién eres yeta.">
          <RivalBars rivals={ins.rivals} />
        </Card>
      </div>
      <div className="grid cv-grid-2">
        <Card title="Local, visita e infiltrado">
          <div className="cv-split">
            <Donut g={c.record.won} e={c.record.drawn} p={c.record.lost} />
            <div className="cv-split-bars">
              <RecordRows
                aria="Resultados de local, de visita e infiltrado"
                rows={[
                  { label: "De local", g: c.home.won, e: c.home.drawn, p: c.home.lost, eff: eff01(c.home) },
                  { label: "De visita", g: c.away.won, e: c.away.drawn, p: c.away.lost, eff: eff01(c.away) },
                  { label: "Infiltrado", g: c.infiltrado.won, e: c.infiltrado.drawn, p: c.infiltrado.lost, eff: eff01(c.infiltrado) },
                ]}
              />
            </div>
          </div>
          {c.infiltrado.played === 0 && <p className="muted small cv-card-hint">¿Fuiste escondido a la galería rival? También cuenta (modo Infiltrado).</p>}
        </Card>
        <Card title="Por competición y fase">
          <RecordRows
            aria="Resultados por competición"
            rows={ins.competitions.map((k) => ({ label: k.name, sub: `${k.pj} PJ`, g: k.g, e: k.e, p: k.p, eff: k.effectiveness }))}
          />
          {ins.phases.length > 1 && (
            <>
              <h3 className="cv-sub">Por fase</h3>
              <RecordRows
                aria="Resultados por fase"
                rows={ins.phases.map((k) => ({ label: PHASE_LABEL[k.phase], sub: `${k.pj} PJ`, g: k.g, e: k.e, p: k.p, eff: k.effectiveness }))}
              />
            </>
          )}
        </Card>
      </div>
      <div className="grid cv-grid-2">
        <Card title="Cuándo vas al estadio" hint="Partidos vistos por mes y por día de la semana.">
          <h3 className="cv-sub">Por mes</h3>
          <ColumnChart
            values={ins.distributions.byMonth}
            labels={MONTHS_LETTER}
            titles={MONTHS_SHORT}
            aria="Partidos vistos por mes del año"
          />
          <h3 className="cv-sub">Por día de la semana</h3>
          <ColumnChart
            values={[1, 2, 3, 4, 5, 6, 0].map((d) => ins.distributions.byWeekday[d])}
            labels={[1, 2, 3, 4, 5, 6, 0].map((d) => WEEKDAYS_SHORT[d])}
            titles={[1, 2, 3, 4, 5, 6, 0].map((d) => WEEKDAYS_FULL[d])}
            aria="Partidos vistos por día de la semana"
          />
        </Card>
        <div className="stack">
          <Card title="Goles">
            <GoalsPanel insights={ins} />
          </Card>
          <Card title="Contigo y sin ti" hint="Partidos de tu club en las temporadas en que fuiste a algún partido.">
            <MissedPanel insights={ins} owner={isOwner} />
          </Card>
        </div>
      </div>
      <Card title="Rachas y récords">
        <RecordsPanel carnet={c} insights={ins} />
      </Card>
      <div className="grid cv-grid-2">
        <Card title="Clásicos">
          {c.classics.length === 0 ? (
            <p className="muted cv-empty">Tu club no tiene clásicos registrados.</p>
          ) : (
            <RecordRows
              aria="Resultados en los clásicos"
              rows={c.classics.map((k) => ({ label: k.rivalry.name, sub: `${k.record.played} PJ`, g: k.record.won, e: k.record.drawn, p: k.record.lost, eff: eff01(k.record) }))}
            />
          )}
        </Card>
        <Card title="Finales">
          {c.finals.length === 0 ? (
            <p className="muted cv-empty">Todavía no marcas ninguna final.</p>
          ) : (
            <Paged>{c.finals.map(({ match, outcome }) => (
              <div key={match.id} className="final-row">
                <span>
                  {match.homeTeamName} {scoreLine(match)} {match.awayTeamName}
                  <span className="muted small"> · {match.tournament}</span>
                </span>
                {outcome && <span className={`pill ${outcome}`}>{OUTCOME_LABEL[outcome]}</span>}
              </div>
            ))}</Paged>
          )}
        </Card>
      </div>
      <Card title="Partidos para el recuerdo">
        <div className="cv-memos">
          <Memorable title="Mayor goleada vista" match={c.biggestWin} />
          <Memorable title="Peor derrota vista" match={c.worstDefeat} />
          <Memorable title="Primer partido" match={c.first} />
          <Memorable title="Último partido" match={c.last} />
        </div>
      </Card>
      <Card title="Todos tus resultados" hint="Un cuadrito por partido, año por año.">
        <ResultStrip points={ins.form} bySeason />
      </Card>
    </>
  );

  const logros = (
    <>
      {!national && <Centenario club={id} total={c.total} owner={isOwner} />}
      <Premios a={achievements} owner={isOwner} />
    </>
  );

  const partidos = (
    <section className="card cv-card">
      <div className="row cv-card-head">
        <h2 className="section-title cv-card-title">{isOwner ? "Tus partidos" : "Sus partidos"}</h2>
        {isOwner && (
          <Link className="btn btn-ghost" href="/partidos">
            Marcar más partidos
          </Link>
        )}
      </div>
      <MatchList items={items} />
    </section>
  );

  return (
    <div className="stack cv" style={clubStyle(id) as React.CSSProperties}>
      <Hero username={username} memberId={memberId} club={club} carnet={c} achievements={achievements} scorers={scorers} clubs={clubs} />
      {!hasData && (
        <div className="card cv-card cv-empty-hero">
          <strong>{isOwner ? "Tu Galería está en cero." : "Esta Galería todavía está en cero."}</strong>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {isOwner ? "Marca los partidos a los que has ido al estadio y aquí aparecerán tu Mufómetro, tus gráficos y tus frases destacadas." : "Cuando marque partidos aparecerán sus estadísticas."}
          </p>
          {isOwner && (
            <div className="row" style={{ marginTop: 12 }}>
              <Link className="btn" href="/importar">
                Subir captura de entradas
              </Link>
              <Link className="btn btn-ghost" href="/partidos">
                Marcar a mano
              </Link>
            </div>
          )}
        </div>
      )}
      {hasData && (
        <CarnetTabs
          tabs={[
            { id: "resumen", label: "Resumen", content: resumen },
            { id: "estadisticas", label: "Estadísticas", content: estadisticas },
            { id: "goleadores", label: "Goleadores", content: <ScorersSection report={scorers} clubId={club.id} clubs={clubs} /> },
            { id: "partidos", label: "Partidos", badge: attended.length, content: partidos },
            { id: "logros", label: "Logros", content: logros },
          ]}
        />
      )}
      {!hasData && upcomingCard}
      <p className="muted small cv-foot">
        {isOwner ? "Tus" : "Sus"} estadísticas son solo para entretención: la cábala y la yeta no existen (o eso dicen).
      </p>
    </div>
  );
}
