import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { ClubIdentity } from "@/lib/clubTheme.ts";
import type { Resumen } from "@/lib/domain/resumen.ts";
import { verdict } from "@/lib/domain/stats.ts";
import { Jersey } from "../Jersey.tsx";
import { formatDate, pct } from "../format.ts";
import { OUTCOME_COLOR, plural, REASON_LABEL, resumenTheme, signed } from "./theme.ts";

function Slide({ n, tone = "dark", label, children }: { n: number; tone?: "dark" | "club"; label: string; children: ReactNode }) {
  return (
    <section className={`rs-slide rs-${tone}`} style={{ "--i": n } as CSSProperties} aria-label={label}>
      <div className="rs-inner">{children}</div>
      <div className="rs-foot" aria-hidden="true">
        GaluchaStats
      </div>
    </section>
  );
}

const score = (r: { goalsFor: number; goalsAgainst: number }) => `${r.goalsFor}-${r.goalsAgainst}`;

/** Las tarjetas "tipo historia" del resumen anual. Cada una tiene un solo mensaje. */
export function ResumenDeck({ username, club, clubName, r, cta }: { username: string; club: ClubIdentity; clubName: string; r: Resumen; cta: ReactNode }) {
  const t = resumenTheme(club);
  const style = { "--rs-bg": t.bg, "--rs-bg-deep": t.bgDeep, "--rs-hi": t.hi, "--rs-hi-ink": t.hiInk } as CSSProperties;
  const v = verdict(r.record);
  const mo = r.matchOfYear;
  let n = 0;

  return (
    <div className="rs-deck" style={style}>
      <Slide n={n++} tone="club" label="Portada">
        <p className="rs-eyebrow">Tu año en la galería</p>
        <h2 className="rs-year">{r.year}</h2>
        <div className="rs-jersey">
          <Jersey club={club} size={120} number="12" />
        </div>
        <p className="rs-handle">@{username}</p>
        <p className="rs-pill">{r.title.label}</p>
      </Slide>

      <Slide n={n++} label="Cuántas veces fuiste">
        <p className="rs-eyebrow">Este año fuiste</p>
        <p className="rs-big">{r.played}</p>
        <p className="rs-h">{r.played === 1 ? "vez a la galería" : "veces a la galería"}</p>
        <p className="rs-line">
          {r.first && r.last && r.first.match.id !== r.last.match.id
            ? `Del ${formatDate(r.first.match.date)} al ${formatDate(r.last.match.date)}, con ${clubName}.`
            : r.first
              ? `Tu partido fue el ${formatDate(r.first.match.date)}, con ${clubName}.`
              : ""}
        </p>
        {r.previous && (
          <p className="rs-chip">
            {r.previous.deltaPlayed === 0
              ? `Los mismos que en ${r.previous.year}`
              : `${signed(r.previous.deltaPlayed)} que en ${r.previous.year}`}
          </p>
        )}
      </Slide>

      <Slide n={n++} label="Tu balance">
        <p className="rs-eyebrow">Tu balance</p>
        <div className="rs-geps">
          {([["G", r.record.won, "Ganados"], ["E", r.record.drawn, "Empates"], ["P", r.record.lost, "Perdidos"]] as const).map(([k, val, lab]) => (
            <div key={k} className="rs-gep" style={{ "--c": OUTCOME_COLOR[k] } as CSSProperties}>
              <span className="rs-gep-n">{val}</span>
              <span className="rs-k">{lab}</span>
            </div>
          ))}
        </div>
        <div className="rs-bar" role="img" aria-label={`${r.record.won} ganados, ${r.record.drawn} empates, ${r.record.lost} perdidos`}>
          <i style={{ flexGrow: r.record.won, background: OUTCOME_COLOR.G }} />
          <i style={{ flexGrow: r.record.drawn, background: OUTCOME_COLOR.E }} />
          <i style={{ flexGrow: r.record.lost, background: OUTCOME_COLOR.P }} />
        </div>
        <p className="rs-k" style={{ marginTop: 18 }}>
          Mufómetro {r.year}
        </p>
        <p className="rs-big rs-big-md">{pct(r.effectiveness)}</p>
        {r.played >= 5 ? <p className="rs-pill">{v.label}</p> : <p className="rs-line">Con 5 partidos o más el Mufómetro te da veredicto.</p>}
        {r.deltaVsClub !== null && Math.abs(r.deltaVsClub) >= 1 && (
          <p className="rs-line">
            {r.deltaVsClub > 0
              ? `${Math.round(r.deltaVsClub)} puntos sobre el resto del año de ${club.short}. Algo tendrás.`
              : `${Math.round(-r.deltaVsClub)} puntos bajo el resto del año de ${club.short}. Ojo con la yeta.`}
          </p>
        )}
        {r.previous && r.previous.deltaEffectiveness !== null && Math.abs(r.previous.deltaEffectiveness) >= 1 && !(r.deltaVsClub !== null && Math.abs(r.deltaVsClub) >= 1) && (
          <p className="rs-chip">{`${signed(r.previous.deltaEffectiveness)} puntos vs ${r.previous.year}`}</p>
        )}
      </Slide>

      {mo && (
        <Slide n={n++} label="Tu partido del año">
          <p className="rs-eyebrow">Tu partido del año</p>
          <p className="rs-chip rs-chip-solid">{REASON_LABEL[mo.reason]}</p>
          <p className="rs-team">{mo.match.homeTeamName}</p>
          <p className="rs-score" style={{ color: OUTCOME_COLOR[mo.outcome] }}>
            {mo.match.homeGoals}-{mo.match.awayGoals}
          </p>
          <p className="rs-team">{mo.match.awayTeamName}</p>
          <p className="rs-line">
            {formatDate(mo.match.date)} · {mo.match.competitionName}
            {mo.match.homePens !== null ? ` · penales ${mo.match.homePens}-${mo.match.awayPens}` : ""}
          </p>
        </Slide>
      )}

      {(r.bestWin || r.worstLoss) && (
        <Slide n={n++} label="Lo mejor y lo peor">
          <p className="rs-eyebrow">Lo mejor y lo peor</p>
          {r.bestWin ? (
            <div className="rs-duo" style={{ "--c": OUTCOME_COLOR.G } as CSSProperties}>
              <span className="rs-k">Mejor victoria</span>
              <strong className="rs-duo-score">{score(r.bestWin)}</strong>
              <span className="rs-duo-match">
                {r.bestWin.match.homeTeamName} - {r.bestWin.match.awayTeamName}
              </span>
              <span className="rs-k">{formatDate(r.bestWin.match.date)}</span>
            </div>
          ) : (
            <p className="rs-line">Este año no viste ganar a tu club. Ya vendrá.</p>
          )}
          {r.worstLoss ? (
            <div className="rs-duo" style={{ "--c": OUTCOME_COLOR.P } as CSSProperties}>
              <span className="rs-k">Peor derrota</span>
              <strong className="rs-duo-score">{score(r.worstLoss)}</strong>
              <span className="rs-duo-match">
                {r.worstLoss.match.homeTeamName} - {r.worstLoss.match.awayTeamName}
              </span>
              <span className="rs-k">{formatDate(r.worstLoss.match.date)}</span>
            </div>
          ) : (
            <p className="rs-line">Y no viste perder a tu club. Cábala pura.</p>
          )}
        </Slide>
      )}

      {(r.idol || r.executioner) && (
        <Slide n={n++} label="Tu ídolo y tu verdugo">
          <p className="rs-eyebrow">Goles que viste: {r.goalsSeenFor + r.goalsSeenAgainst}</p>
          {r.idol && (
            <div className="rs-duo" style={{ "--c": OUTCOME_COLOR.G } as CSSProperties}>
              <span className="rs-k">Tu ídolo del año</span>
              <strong className="rs-name">{r.idol.player}</strong>
              <span className="rs-duo-match">{plural(r.idol.goals, "gol", "goles")} que viste</span>
            </div>
          )}
          {r.executioner && (
            <div className="rs-duo" style={{ "--c": OUTCOME_COLOR.P } as CSSProperties}>
              <span className="rs-k">Tu verdugo del año</span>
              <strong className="rs-name">{r.executioner.player}</strong>
              <span className="rs-duo-match">{plural(r.executioner.goals, "gol", "goles")} contra tu club</span>
            </div>
          )}
        </Slide>
      )}

      {r.busiestMonth && (
        <Slide n={n++} label="Tu mes">
          <p className="rs-eyebrow">Tu mes</p>
          <p className="rs-big rs-month">{r.busiestMonth.name}</p>
          <p className="rs-h">{plural(r.busiestMonth.count, "partido", "partidos")}</p>
          {r.topRival && (
            <>
              <p className="rs-k" style={{ marginTop: 22 }}>
                Rival que más viste
              </p>
              <p className="rs-name">{r.topRival.name}</p>
              <p className="rs-line">{plural(r.topRival.count, "vez", "veces")} en la galería</p>
            </>
          )}
        </Slide>
      )}

      {r.streak && (
        <Slide n={n++} label="Tu racha">
          <p className="rs-eyebrow">Tu mejor racha</p>
          <p className="rs-big">{r.streak.length}</p>
          <p className="rs-h">
            {r.streak.kind === "wins"
              ? "victorias seguidas"
              : r.streak.length === 1
                ? "partido sin perder"
                : "partidos sin perder"}
          </p>
          <div className="rs-seq" role="img" aria-label={`Resultados del año: ${r.sequence.join(", ")}`}>
            {r.sequence.slice(0, 40).map((o, i) => (
              <i key={i} style={{ background: OUTCOME_COLOR[o] }} />
            ))}
          </div>
          <p className="rs-line">
            {r.longestWinless >= 4 ? `También aguantaste ${r.longestWinless} partidos sin ganar. Eso es fe.` : "Cada cuadrito es un partido, en orden."}
          </p>
        </Slide>
      )}

      <Slide n={n++} tone="club" label="Cierre">
        <p className="rs-eyebrow">Te dicen</p>
        <p className="rs-title">{r.title.label}</p>
        <p className="rs-line">{r.title.blurb}</p>
        <p className="rs-h" style={{ marginTop: 18 }}>
          ¿Y tu año?
        </p>
        <div className="rs-cta">{cta}</div>
      </Slide>
    </div>
  );
}

export function CtaCrear() {
  return (
    <Link className="btn rs-btn" href="/registro">
      Crear mi carnet
    </Link>
  );
}
