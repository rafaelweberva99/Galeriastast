import Link from "next/link";
import { getDb } from "@/lib/db/client.ts";
import { clubsByFans } from "@/lib/repo/rankings.ts";
import { topFans } from "@/lib/repo/liga.ts";
import { listClubs } from "@/lib/repo/teams.ts";
import { visibleClubs } from "@/lib/mvp.ts";
import { ClubBadge } from "@/components/ClubBadge.tsx";

export const metadata = { title: "Rankings · GaluchaStats" };

export default async function RankingsPage() {
  const db = await getDb();
  const top = await topFans(db, 10);
  const fans = new Map((await clubsByFans(db)).map((c) => [c.clubId, c]));
  const clubs = visibleClubs(await listClubs(db)).sort((a, b) => (fans.get(b.id)?.fans ?? 0) - (fans.get(a.id)?.fans ?? 0));
  return (
    <div className="stack">
      <div>
        <h1 className="section-title">Rankings de hinchas por club</h1>
        <p className="muted">Los hinchas que más fueron a la cancha, club por club, y las mayores cábalas y yetas.</p>
      </div>
      {top.length > 0 && (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Los que más van a la cancha</h2>
          <ol style={{ margin: 0, paddingLeft: 20 }}>
            {top.map((f) => (
              <li key={f.username} style={{ margin: "6px 0" }}>
                <Link href={`/hincha/${f.username}`}>@{f.username}</Link> · {f.clubName} · <strong>{f.attended}</strong>{" "}
                {f.attended === 1 ? "partido" : "partidos"}
              </li>
            ))}
          </ol>
        </section>
      )}
      <div className="grid grid-3">
        {clubs.map((c) => (
          <Link key={c.id} href={`/rankings/${c.id}`} className="card row" style={{ textDecoration: "none", borderTop: `5px solid ${c.colorPrimary}`, opacity: (fans.get(c.id)?.fans ?? 0) === 0 ? 0.6 : 1 }}>
            <ClubBadge team={c} size={40} />
            <div>
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div className="muted small">
                {fans.get(c.id)?.fans ?? 0} {(fans.get(c.id)?.fans ?? 0) === 1 ? "hincha" : "hinchas"} ·{" "}
                {fans.get(c.id)?.attendances ?? 0} partidos marcados
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
