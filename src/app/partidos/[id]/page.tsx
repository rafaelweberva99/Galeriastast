import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { clubIdentity } from "@/lib/clubTheme.ts";
import { goalCoverage, headToHead, matchDescription, matchPhase, matchTitle, summarizeCrowd } from "@/lib/domain/matchPage.ts";
import { goalsForMatches } from "@/lib/repo/goals.ts";
import { getMatch } from "@/lib/repo/matches.ts";
import { matchCrowd, matchesBetween, rivalryBetween } from "@/lib/repo/matchPage.ts";
import { getTeam, listClubs } from "@/lib/repo/teams.ts";
import { attendanceModes } from "@/lib/repo/users.ts";
import { AttendanceToggle } from "@/components/AttendanceToggle.tsx";
import { MatchHeader } from "@/components/matchpage/MatchHeader.tsx";
import { GoalsSection } from "@/components/matchpage/GoalsSection.tsx";
import { CrowdSection } from "@/components/matchpage/CrowdSection.tsx";
import { HistorySection } from "@/components/matchpage/HistorySection.tsx";

type Params = Promise<{ id: string }>;
const today = () => new Date().toISOString().slice(0, 10);

async function load(id: string) {
  const db = await getDb();
  const match = await getMatch(db, decodeURIComponent(id));
  if (!match) return null;
  const [home, away] = await Promise.all([getTeam(db, match.homeTeamId), getTeam(db, match.awayTeamId)]);
  if (!home || !away) return null;
  return { db, match, home, away };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load((await params).id);
  if (!data) return { title: "Partido no encontrado · GaluchaStats" };
  const { match, home, away } = data;
  const title = matchTitle(match, home.shortName, away.shortName);
  const description = matchDescription(match, home.shortName, away.shortName, matchPhase(match, today()));
  return {
    title: `${title} · GaluchaStats`,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function MatchPage({ params }: { params: Params }) {
  const data = await load((await params).id);
  if (!data) notFound();
  const { db, match, home, away } = data;
  const now = today();
  const phase = matchPhase(match, now);
  const user = await currentUser();

  const [goalsMap, between, rivalry, crowd, modes, clubs] = await Promise.all([
    goalsForMatches(db, [match.id]),
    matchesBetween(db, match.homeTeamId, match.awayTeamId),
    rivalryBetween(db, match.homeTeamId, match.awayTeamId),
    matchCrowd(db, match.id),
    user ? attendanceModes(db, user.id) : Promise.resolve(null),
    listClubs(db),
  ]);
  const goals = goalsMap.get(match.id) ?? [];
  const summary = summarizeCrowd(crowd);
  const h2h = headToHead(between, match.homeTeamId, match.id);
  const names = new Map([
    ...clubs.map((c) => [c.id, c.shortName] as const),
    [home.id, home.shortName],
    [away.id, away.shortName],
  ]);

  return (
    <div className="stack mp">
      <nav className="small muted" aria-label="Migas de pan">
        <Link href="/partidos">Partidos</Link> · {match.season}
      </nav>
      <MatchHeader
        match={match}
        phase={phase}
        today={now}
        home={{ team: home, identity: clubIdentity(home) }}
        away={{ team: away, identity: clubIdentity(away) }}
        rivalry={rivalry?.name ?? null}
      />
      {user && (
        <section className="card mp-toggle">
          <div>
            <strong>{phase === "futuro" ? "¿Vas a ir?" : "¿Fuiste a este partido?"}</strong>
            <div className="muted small">Se suma a tu carnet de hincha.</div>
          </div>
          <AttendanceToggle matchId={match.id} initial={modes?.get(match.id) ?? "ninguno"} upcoming={phase === "futuro"} />
        </section>
      )}
      {!user && (
        <p className="muted small">
          <Link href="/ingresar">Ingresa</Link> o <Link href="/registro">crea tu carnet</Link> para marcar si fuiste.
        </p>
      )}
      {phase !== "futuro" && (
        <GoalsSection match={match} goals={goals} coverage={goalCoverage(match, goals)} phase={phase} />
      )}
      <CrowdSection summary={summary} phase={phase} names={names} homeId={home.id} awayId={away.id} />
      <HistorySection
        h2h={h2h}
        homeId={home.id}
        homeName={home.shortName}
        awayName={away.shortName}
        names={names}
        rivalry={rivalry?.name ?? null}
      />
    </div>
  );
}
