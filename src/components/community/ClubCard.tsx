import Link from "next/link";
import { clubIdentity, clubStyle, fansLabel } from "@/lib/clubTheme.ts";
import type { Team } from "@/lib/repo/teams.ts";
import type { ClubCommunity } from "@/lib/repo/community.ts";
import { pct } from "@/components/format.ts";
import { Jersey } from "@/components/Jersey.tsx";
import { VerdictBar } from "./VerdictBar.tsx";
import { Waiting } from "./Waiting.tsx";

/** Tarjeta de un club en el panorama, teñida con sus colores. */
export function ClubCard({ team, stats }: { team: Team; stats: ClubCommunity | undefined }) {
  const identity = clubIdentity(team);
  const fans = stats?.fans ?? 0;
  const word = fansLabel(identity);
  return (
    <Link href={`/estadisticas/${team.id}`} className="card cm-club" style={clubStyle(identity) as React.CSSProperties}>
      <div className="cm-club-head">
        <Jersey club={identity} size={44} />
        <div>
          <strong>{team.name}</strong>
          <div className="muted small">
            {fans} {fans === 1 ? "hincha" : "hinchas"} con perfil público
          </div>
        </div>
      </div>
      {stats && stats.attended !== null ? (
        <>
          <dl className="cm-kpis">
            <div>
              <dt>Partidos marcados</dt>
              <dd>{stats.attended}</dd>
            </div>
            <div>
              <dt>Por hincha</dt>
              <dd>{stats.avgAttended!.toFixed(1)}</dd>
            </div>
            <div>
              <dt>Mufómetro medio</dt>
              <dd>{pct(stats.avgEffectiveness)}</dd>
            </div>
          </dl>
          {stats.shares ? <VerdictBar shares={stats.shares} /> : null}
        </>
      ) : (
        <Waiting fans={fans} fansWord={word} compact />
      )}
    </Link>
  );
}
