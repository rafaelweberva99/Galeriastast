import Link from "next/link";
import { getDb } from "@/lib/db/client.ts";
import { clubsByFans } from "@/lib/repo/rankings.ts";
import { listClubs } from "@/lib/repo/teams.ts";
import { ClubBadge } from "@/components/ClubBadge.tsx";

export const metadata = { title: "Rankings · GaleríaStats" };

export default function RankingsPage() {
  const db = getDb();
  const fans = new Map(clubsByFans(db).map((c) => [c.clubId, c]));
  const clubs = listClubs(db).sort((a, b) => (fans.get(b.id)?.fans ?? 0) - (fans.get(a.id)?.fans ?? 0));
  return (
    <div className="stack">
      <div>
        <h1>Rankings de hinchas por club</h1>
        <p className="muted">Los hinchas que más fueron a la cancha, club por club, y las mayores cábalas y yetas.</p>
      </div>
      <div className="grid grid-3">
        {clubs.map((c) => (
          <Link key={c.id} href={`/rankings/${c.id}`} className="card row" style={{ textDecoration: "none" }}>
            <ClubBadge primary={c.colorPrimary} secondary={c.colorSecondary} size={32} />
            <div>
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div className="muted small">
                {fans.get(c.id)?.fans ?? 0} hinchas · {fans.get(c.id)?.attendances ?? 0} partidos marcados
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
