import Link from "next/link";
import { notFound } from "next/navigation";
import { clubIdentity, clubStyle, fansLabel } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { MIN_COMMUNITY_FANS } from "@/lib/domain/community.ts";
import { clubCommunityDetail, type MostMarkedMatch, type ScorerSeen } from "@/lib/repo/community.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { isVisibleClub } from "@/lib/mvp.ts";
import { currentUser } from "@/lib/auth.ts";
import { isAdmin } from "@/lib/admin.ts";
import { formatDate, pct } from "@/components/format.ts";
import { Jersey } from "@/components/Jersey.tsx";
import { HBars } from "@/components/community/Bars.tsx";
import { VerdictBar } from "@/components/community/VerdictBar.tsx";
import { Waiting } from "@/components/community/Waiting.tsx";

type Params = Promise<{ club: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const team = await getTeam(await getDb(), (await params).club);
  return { title: team ? `Estadísticas de la hinchada de ${team.shortName} · GaluchaStats` : "Estadísticas · GaluchaStats" };
}

const matchLabel = (m: MostMarkedMatch) =>
  `${m.home} ${m.homeGoals ?? "-"}–${m.awayGoals ?? "-"} ${m.away}`;

export default async function ClubCommunityPage({ params }: { params: Params }) {
  const { club } = await params;
  const db = await getDb();
  const team = await getTeam(db, club);
  if (!team || (!isVisibleClub(team.id) && !isAdmin(await currentUser()))) notFound();
  const d = await clubCommunityDetail(db, team.id);
  const identity = clubIdentity(team);
  const word = fansLabel(identity);
  const open = d.attended !== null;

  const matchBars = (list: MostMarkedMatch[]) => (
    <HBars
      unit={undefined}
      items={list.map((m) => ({
        key: m.matchId,
        label: matchLabel(m),
        sub: `${formatDate(m.date)} · temporada ${m.season}`,
        value: m.fans,
        valueLabel: `${m.fans} ${m.fans === 1 ? "hincha" : "hinchas"}`,
      }))}
    />
  );

  return (
    <div className="stack" style={clubStyle(identity) as React.CSSProperties}>
      <div className="club-banner row">
        <Jersey club={identity} size={72} />
        <div>
          <div className="small">
            <Link href="/estadisticas">← Estadísticas de la comunidad</Link>
          </div>
          <h1>Hinchada de {team.shortName}</h1>
          <span className="muted">
            {d.fans} {d.fans === 1 ? "hincha" : "hinchas"} con perfil público ·{" "}
            <Link href={`/clubes/${team.id}`}>Ver el club</Link>
          </span>
        </div>
      </div>

      {!open ? (
        <section className="card cm-empty">
          <Waiting fans={d.fans} fansWord={word} />
          <p className="muted" style={{ margin: 0 }}>
            Las cifras de una hinchada se abren desde {MIN_COMMUNITY_FANS} hinchas para que nadie quede identificado.
            Invita a tus amigos de la galería a crear su carnet y dejar su perfil público.
          </p>
          <Link href="/registro" className="btn" style={{ alignSelf: "flex-start" }}>
            Sumarme a la hinchada
          </Link>
        </section>
      ) : (
        <>
          <section className="grid grid-4">
            <div className="card stat">
              <span className="stat-value">{d.attended}</span>
              <span className="stat-label">partidos marcados</span>
            </div>
            <div className="card stat">
              <span className="stat-value">{d.avgAttended!.toFixed(1)}</span>
              <span className="stat-label">partidos por hincha</span>
            </div>
            <div className="card stat">
              <span className="stat-value">{pct(d.avgEffectiveness)}</span>
              <span className="stat-label">Mufómetro medio</span>
            </div>
            <div className="card stat">
              <span className="stat-value">{d.fans}</span>
              <span className="stat-label">hinchas públicos</span>
            </div>
          </section>

          <section className="card stack">
            <div>
              <h2 style={{ margin: 0 }}>¿Cábalas o yetas?</h2>
              <span className="muted small">Cómo se reparte la hinchada según el Mufómetro de cada uno.</span>
            </div>
            {d.shares ? (
              <VerdictBar shares={d.shares} />
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Aún no hay {MIN_COMMUNITY_FANS} hinchas con 5 o más partidos de su club. Marcando más partidos se abre este gráfico.
              </p>
            )}
          </section>

          <section className="grid grid-2">
            <div className="card stack">
              <div>
                <h2 style={{ margin: 0 }}>Partidos más marcados · {d.season}</h2>
                <span className="muted small">Cuántos hinchas dicen haber estado.</span>
              </div>
              {d.topSeason.length ? matchBars(d.topSeason) : <p className="muted" style={{ margin: 0 }}>Este año todavía no coinciden dos hinchas en un mismo partido.</p>}
            </div>
            <div className="card stack">
              <div>
                <h2 style={{ margin: 0 }}>Partidos más marcados · todos los tiempos</h2>
                <span className="muted small">Los partidos que más hinchas comparten.</span>
              </div>
              {d.topAllTime.length ? matchBars(d.topAllTime) : <p className="muted" style={{ margin: 0 }}>Aún no coinciden dos hinchas en un mismo partido.</p>}
            </div>
          </section>

          <section className="grid grid-2">
            <ScorerCard title="Goleadores más vistos" note={`Goles de ${team.shortName} que vio la hinchada`} list={d.scorersFor} empty="Todavía no hay goles registrados en los partidos marcados." />
            <ScorerCard title="Verdugos más vistos" note="Rivales que más goles le hicieron al club delante de la hinchada" list={d.scorersAgainst} empty="Sin verdugos a la vista." showTeam />
          </section>
        </>
      )}

      <section className="card stack">
        <div>
          <h2 style={{ margin: 0 }}>Hinchas más fieles</h2>
          <span className="muted small">Quienes más partidos marcaron (perfiles públicos).</span>
        </div>
        {d.faithful.length ? (
          <HBars
            items={d.faithful.map((f) => ({
              key: f.username,
              label: `${f.rank}. @${f.username}`,
              value: f.attended,
              valueLabel: `${f.attended} partidos`,
              href: `/hincha/${f.username}`,
            }))}
          />
        ) : (
          <p className="muted" style={{ margin: 0 }}>Aún no hay hinchas con partidos marcados. ¡Sé el primero de {team.shortName}!</p>
        )}
      </section>
    </div>
  );
}

function ScorerCard({ title, note, list, empty, showTeam }: { title: string; note: string; list: ScorerSeen[]; empty: string; showTeam?: boolean }) {
  return (
    <div className="card stack">
      <div>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <span className="muted small">{note}</span>
      </div>
      {list.length ? (
        <HBars
          items={list.map((s) => ({
            key: `${s.player}-${s.team}`,
            label: s.player,
            sub: showTeam && s.team ? s.team : undefined,
            value: s.goals,
            valueLabel: `${s.goals} ${s.goals === 1 ? "gol" : "goles"}`,
          }))}
        />
      ) : (
        <p className="muted" style={{ margin: 0 }}>{empty}</p>
      )}
    </div>
  );
}
