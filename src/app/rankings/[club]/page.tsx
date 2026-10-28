import Link from "next/link";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { Jersey } from "@/components/Jersey.tsx";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/client.ts";
import { fansOfClub, topCabalas, type FanRanking } from "@/lib/repo/rankings.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { pct } from "@/components/format.ts";

type Params = Promise<{ club: string }>;

function FanTable({ rows, empty }: { rows: FanRanking[]; empty: string }) {
  if (!rows.length) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Hincha</th>
            <th className="num">Partidos</th>
            <th className="num">G-E-P</th>
            <th className="num">Efect.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f, i) => (
            <tr key={f.username}>
              <td>{i + 1}</td>
              <td>
                <Link href={`/hincha/${f.username}`}>@{f.username}</Link>
              </td>
              <td className="num">{f.attended}</td>
              <td className="num">
                {f.won}-{f.drawn}-{f.lost}
              </td>
              <td className="num">{pct(f.effectiveness)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ClubRankingPage({ params }: { params: Params }) {
  const { club: clubId } = await params;
  const db = await getDb();
  const club = await getTeam(db, clubId);
  if (!club) notFound();
  const identity = clubIdentity(club);
  const fans = await fansOfClub(db, club.id);
  const cabalas = topCabalas(fans);
  return (
    <div className="stack" style={clubStyle(identity) as React.CSSProperties}>
      <div className="club-banner row">
        <Jersey club={identity} size={72} number="12" />
        <div>
          <div className="small">Ranking de hinchas</div>
          <h1>{identity.fansPlural ? `Los ${identity.fansPlural}` : club.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            <Link href={`/clubes/${club.id}`}>Historial del club</Link> · <Link href="/rankings">Todos los clubes</Link>
          </p>
        </div>
      </div>
      <div className="grid grid-2">
        <section className="card">
          <h2 className="section-title">Los que más fueron</h2>
          <FanTable rows={fans.slice(0, 50)} empty="Todavía no hay hinchas con partidos marcados." />
        </section>
        <section className="card">
          <h2 className="section-title">Mayores cábalas</h2>
          <FanTable rows={cabalas.slice(0, 10)} empty="Se necesitan hinchas con al menos 5 partidos." />
          <h2 className="section-title section">Mayores yetas</h2>
          <FanTable rows={[...cabalas].reverse().slice(0, 10)} empty="Se necesitan hinchas con al menos 5 partidos." />
        </section>
      </div>
    </div>
  );
}
