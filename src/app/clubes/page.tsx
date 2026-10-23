import Link from "next/link";
import { getDb } from "@/lib/db/client.ts";
import { listClubs } from "@/lib/repo/teams.ts";
import { ClubBadge } from "@/components/ClubBadge.tsx";

export const metadata = { title: "Clubes · GaleríaStats" };

export default function ClubsPage() {
  const clubs = listClubs(getDb());
  return (
    <div className="stack">
      <h1 className="section-title">Clubes</h1>
      <div className="grid grid-3">
        {clubs.map((c) => (
          <Link key={c.id} href={`/clubes/${c.id}`} className="card row" style={{ textDecoration: "none", borderTop: `5px solid ${c.colorPrimary}` }}>
            <ClubBadge team={c} size={40} />
            <div>
              <div style={{ fontWeight: 700 }}>{c.name}</div>
              <div className="muted small">
                {c.city ?? "—"} · {c.matches} partidos registrados
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
