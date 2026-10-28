import Link from "next/link";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { listClubs } from "@/lib/repo/teams.ts";
import { Jersey } from "@/components/Jersey.tsx";

export const metadata = { title: "Clubes · GaleríaStats" };

export default async function ClubsPage() {
  const clubs = await listClubs(await getDb());
  const latest = Math.max(...clubs.map((c) => c.lastSeason));
  const groups: [string, typeof clubs][] = [
    [`En Primera ${latest}`, clubs.filter((c) => c.lastSeason === latest)],
    ["Pasaron por Primera", clubs.filter((c) => c.lastSeason !== latest)],
  ];
  return (
    <div className="stack">
      <h1 className="section-title">Clubes</h1>
      {groups.map(([title, list]) => (
        <section key={title} className="stack">
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div className="club-cards">
            {list.map((t) => {
              const c = clubIdentity(t);
              return (
                <Link key={t.id} href={`/clubes/${t.id}`} className="club-card" style={clubStyle(c) as React.CSSProperties}>
                  <Jersey club={c} size={58} />
                  <span>
                    <strong>{t.name}</strong>
                    <small>{[c.alias, c.stadium ?? t.city].filter(Boolean).join(" · ")}</small>
                    <small>
                      {t.matches} partidos{t.fans ? ` · ${t.fans} ${t.fans === 1 ? "hincha" : "hinchas"}` : ""}
                    </small>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
