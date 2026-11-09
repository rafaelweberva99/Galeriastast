import Link from "next/link";
import type { Carnet } from "@/lib/domain/stats.ts";
import type { Achievements } from "@/lib/domain/achievements.ts";
import type { Team } from "@/lib/repo/teams.ts";
import type { ScorersReport, ScorerTally } from "@/lib/domain/scorers.ts";
import { clubIdentity } from "@/lib/clubTheme.ts";
import { isVisibleClub } from "@/lib/mvp.ts";
import { Jersey } from "../Jersey.tsx";
import { Mufometro } from "../Mufometro.tsx";
import { pct } from "../format.ts";

/** Cabecera del carnet: identidad del hincha, Mufómetro y las cifras clave (lo más valioso, arriba). */
export function Hero({
  username,
  memberId,
  club,
  carnet: c,
  achievements,
  scorers,
  clubs,
}: {
  username: string;
  memberId: number;
  club: Team;
  carnet: Carnet;
  achievements: Achievements;
  scorers: ScorersReport;
  clubs: Team[];
}) {
  const id = clubIdentity(club);
  const since = c.first ? c.first.season : null;
  const impact = c.impact;
  const phrase =
    c.verdict.key === "cabala" || c.verdict.key === "cabala-absoluta"
      ? id.needsYou
      : c.verdict.key === "yeta" || c.verdict.key === "yeta-total"
        ? "Quizás conviene verlo por la tele…"
        : c.verdict.description;
  const cur = c.streaks.current;
  const kpis: { value: string; label: string; sub?: string }[] = [
    { value: String(c.bySeason.length), label: c.bySeason.length === 1 ? "temporada" : "temporadas" },
    { value: c.effectiveness === null ? "—" : pct(c.effectiveness), label: "efectividad" },
    {
      value: impact === null ? "—" : `${impact >= 0 ? "▲" : "▼"} ${Math.abs(impact).toFixed(1).replace(".", ",")}`,
      label: "pts vs. tu club",
      sub: c.baselineEffectiveness === null ? undefined : `club ${pct(c.baselineEffectiveness)}`,
    },
    { value: `${c.record.won}-${c.record.drawn}-${c.record.lost}`, label: "G-E-P" },
    { value: `${c.record.goalsFor}-${c.record.goalsAgainst}`, label: "goles" },
    { value: cur ? `${cur.length}${cur.outcome}` : "—", label: "racha actual" },
  ];
  const idol = scorers.idols[0];
  const foe = scorers.executioners[0];
  const teams = new Map(clubs.map((t) => [t.id, t]));
  const foeTeam = foe ? teams.get(foe.teamId) : undefined;
  const foeClubs = foe ? foe.teamIds.map((tid) => teams.get(tid)?.shortName ?? tid).join(" · ") : "";
  const goalsText = (s: ScorerTally) => `${s.goals} ${s.goals === 1 ? "gol" : "goles"}`;
  return (
    <section className={`socio-card cv-hero tier-${achievements.tier.key}`}>
      {achievements.tier.key !== "socio" && (
        <div className="tier-ribbon" aria-label={achievements.tier.label}>
          {achievements.tier.label.replace("Carnet ", "")}
        </div>
      )}
      <div className="cv-hero-id">
        <Jersey club={id} size={84} number="12" />
        <div className="cv-hero-name">
          <div className="socio-kicker">Carnet de hincha · {id.nickname}</div>
          <h1 className="socio-name">@{username}</h1>
          <div className="socio-meta">
            {isVisibleClub(club.id) ? <Link href={`/clubes/${club.id}`}>{club.name}</Link> : club.name}
            {id.stadium ? ` · ${id.stadium}` : ""}
          </div>
          <div className="socio-meta">
            Socio N° {String(memberId).padStart(6, "0")}
            {since ? ` · desde ${since}` : ""}
          </div>
        </div>
      </div>
      <div className="cv-trio">
        <div className="cv-trio-tile cv-trio-games">
          <span className="cv-trio-label">En el estadio</span>
          <strong className="cv-trio-big">{c.total}</strong>
          <span className="cv-trio-sub">{c.total === 1 ? "partido" : "partidos"}</span>
        </div>
        <div className="cv-trio-tile">
          <span className="cv-trio-label">Tu ídolo</span>
          {idol ? (
            <>
              <Jersey club={id} size={44} />
              <strong className="cv-trio-name">{idol.player}</strong>
              <span className="cv-trio-sub">{goalsText(idol)} que viste</span>
            </>
          ) : (
            <span className="cv-trio-sub">Aún sin goleadores cargados</span>
          )}
        </div>
        <div className="cv-trio-tile cv-trio-foe">
          <span className="cv-trio-label">Tu verdugo</span>
          {foe ? (
            <>
              {foeTeam && <Jersey club={clubIdentity(foeTeam)} size={44} />}
              <strong className="cv-trio-name">{foe.player}</strong>
              <span className="cv-trio-sub">
                {goalsText(foe)} contra tu club{foeClubs ? ` · ${foeClubs}` : ""}
              </span>
            </>
          ) : (
            <span className="cv-trio-sub">Aún sin goleadores cargados</span>
          )}
        </div>
      </div>
      <div className="mufometro-panel cv-hero-gauge">
        <div className="socio-kicker" style={{ opacity: 0.6 }}>
          Mufómetro
        </div>
        <Mufometro value={c.effectiveness} verdict={c.verdict} />
        <p className="verdict">{c.verdict.label}</p>
        <p className="small cv-hero-phrase">{phrase}</p>
      </div>
      <dl className="cv-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="cv-kpi">
            <dt>{k.label}</dt>
            <dd>{k.value}</dd>
            {k.sub && <span className="cv-kpi-sub">{k.sub}</span>}
          </div>
        ))}
      </dl>
      <div className="cheer cv-hero-cheer">{id.cheer}</div>
    </section>
  );
}
