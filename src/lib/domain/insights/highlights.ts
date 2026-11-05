/**
 * Frases destacadas, listas para mostrar. Reglas: cada frase se apoya en números reales, exige una muestra mínima
 * y no repite el mismo hecho dos veces. Si el dato no alcanza, no hay frase.
 */
import { decidedOutcome } from "../stats.ts";
import type { Match } from "../types.ts";
import { WEEKDAY_NAMES, marginFor, pct, plural, rated, scoreLabel, spanLabel } from "./aggregate.ts";
import type { Highlight, Insights, StreakInfo } from "./types.ts";

export const MAX_HIGHLIGHTS = 10;

const year = (m: Match) => m.date.slice(0, 4);
const dec = (x: number) => x.toFixed(1).replace(".", ",");
const wins = (n: number) => (n === 0 ? "ninguna victoria" : plural(n, "victoria", "victorias"));
const clamp = (x: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, x));

export function buildHighlights(ins: Insights, mine: Match[], clubId: string, club: string): Highlight[] {
  const out: Highlight[] = [];
  const push = (h: Omit<Highlight, "matchIds"> & { matchIds?: string[] }) => out.push({ matchIds: [], ...h });
  const idsBetween = (s: StreakInfo) => mine.filter((m) => m.date >= s.from && m.date <= s.to).map((m) => m.id);
  if (ins.played === 0) return out;

  // 1. Rivales: el más yeta y el más cábala (con muestra mínima y brecha ya validada en el veredicto).
  const gap = (r: Insights["rivals"][number]) => Math.abs(r.effectiveness - (r.clubEffectiveness ?? r.effectiveness));
  const pickRival = (v: "cabala" | "yeta") =>
    ins.rivals.filter((r) => r.verdict === v).sort((a, b) => gap(b) * b.pj - gap(a) * a.pj || b.pj - a.pj)[0];
  const yeta = pickRival("yeta");
  const cabala = pickRival("cabala");
  if (yeta) {
    push({
      id: `rival-yeta-${yeta.rivalId}`,
      tone: "bad",
      title: "Tu rival yeta",
      text: `Contra ${yeta.rivalName} eres yeta: ${wins(yeta.g)} en ${plural(yeta.pj, "partido", "partidos")} (el club rinde ${pct(yeta.clubEffectiveness!)} en general).`,
      weight: clamp(78 + gap(yeta) * 40 + yeta.pj),
      matchIds: mine.filter((m) => m.homeTeamId === yeta.rivalId || m.awayTeamId === yeta.rivalId).map((m) => m.id),
    });
  }
  if (cabala) {
    push({
      id: `rival-cabala-${cabala.rivalId}`,
      tone: "good",
      title: "Tu rival cábala",
      text: `Contra ${cabala.rivalName} eres cábala: ${wins(cabala.g)} en ${plural(cabala.pj, "partido", "partidos")} (el club rinde ${pct(cabala.clubEffectiveness!)} en general).`,
      weight: clamp(78 + gap(cabala) * 40 + cabala.pj),
      matchIds: mine.filter((m) => m.homeTeamId === cabala.rivalId || m.awayTeamId === cabala.rivalId).map((m) => m.id),
    });
  }
  const mostSeen = ins.rivals[0];
  if (mostSeen && mostSeen.pj >= 5 && mostSeen.rivalId !== yeta?.rivalId && mostSeen.rivalId !== cabala?.rivalId) {
    push({
      id: `rival-mas-visto-${mostSeen.rivalId}`,
      tone: "neutral",
      title: "Tu rival de siempre",
      text: `Has visto ${plural(mostSeen.pj, "partido", "partidos")} contra ${mostSeen.rivalName}: ${plural(mostSeen.g, "victoria", "victorias")}, ${plural(mostSeen.e, "empate", "empates")} y ${plural(mostSeen.p, "derrota", "derrotas")}.`,
      weight: 45,
    });
  }

  // 2. Temporadas.
  const { bestSeason, worstSeason } = ins.records;
  if (bestSeason) {
    const rest = bestSeason.clubEffectiveness !== null ? ` (el club, en todo el año, rindió ${pct(bestSeason.clubEffectiveness)})` : "";
    push({
      id: `temporada-mejor-${bestSeason.season}`,
      tone: bestSeason.effectiveness >= 0.5 ? "good" : "neutral",
      title: "Tu mejor temporada",
      text: `En ${bestSeason.season} ${club} rindió ${pct(bestSeason.effectiveness)} en los ${bestSeason.pj} partidos que viste (${plural(bestSeason.g, "ganado", "ganados")}): tu mejor temporada${rest}.`,
      weight: clamp(60 + bestSeason.effectiveness * 25 + (bestSeason.delta ?? 0) / 4),
      matchIds: mine.filter((m) => m.season === bestSeason.season).map((m) => m.id),
    });
  }
  if (worstSeason && worstSeason.effectiveness < 0.5) {
    push({
      id: `temporada-peor-${worstSeason.season}`,
      tone: "bad",
      title: "Tu temporada más dura",
      text: `En ${worstSeason.season} ${club} sacó ${pct(worstSeason.effectiveness)} en los ${worstSeason.pj} partidos que viste (${plural(worstSeason.g, "ganado", "ganados")}): tu temporada más dura.`,
      weight: clamp(55 + (0.5 - worstSeason.effectiveness) * 40),
      matchIds: mine.filter((m) => m.season === worstSeason.season).map((m) => m.id),
    });
  }

  // 3. Contigo vs sin ti.
  const ms = ins.missed;
  if (ms && ms.withYou.pj >= 5 && ms.without.pj >= 5) {
    const w = ms.withYou.effectiveness;
    const wo = ms.without.effectiveness;
    const diff = w - wo;
    const text =
      diff >= 0.05
        ? `Cuando fuiste, ${club} rindió ${pct(w)}; cuando faltaste, ${pct(wo)}. Se nota que estás en la galería.`
        : diff <= -0.05
          ? `Cuando faltaste, ${club} rindió ${pct(wo)}; cuando fuiste, ${pct(w)}. Será casualidad, pero ahí queda el dato.`
          : `Cuando fuiste, ${club} rindió ${pct(w)}; cuando faltaste, ${pct(wo)}. Tu galería no cambia nada… ¡o sí!`;
    push({
      id: "contigo-vs-sin-ti",
      tone: diff >= 0.05 ? "good" : diff <= -0.05 ? "bad" : "fun",
      title: "Contigo y sin ti",
      text,
      weight: clamp(72 + Math.abs(diff) * 60),
    });
  }
  const bigMissed = (m: Match | null) => (m && Math.abs(marginFor(m, clubId)) >= 3 ? m : null);
  const winMissed = bigMissed(ms?.biggestWinMissed ?? null);
  if (winMissed && marginFor(winMissed, clubId) > 0) {
    push({
      id: "goleada-perdida",
      tone: "fun",
      title: "Te la perdiste",
      text: `No estuviste en la goleada ${scoreLabel(winMissed)} (${year(winMissed)}), pese a que ese año sí fuiste a otros partidos.`,
      weight: 50 + marginFor(winMissed, clubId),
      matchIds: [winMissed.id],
    });
  }
  const lossMissed = bigMissed(ms?.biggestLossMissed ?? null);
  if (lossMissed && marginFor(lossMissed, clubId) < 0) {
    push({
      id: "derrota-zafada",
      tone: "fun",
      title: "Zafaste",
      text: `Te libraste del ${scoreLabel(lossMissed)} (${year(lossMissed)}): la peor derrota que no viste.`,
      weight: 48 - marginFor(lossMissed, clubId),
      matchIds: [lossMissed.id],
    });
  }
  if (ms && ms.finalsMissed.length > 0) {
    push({
      id: "finales-perdidas",
      tone: "fun",
      title: "Finales ausentes",
      text: `En las temporadas en que fuiste a la cancha, ${club} jugó ${plural(ms.finalsMissed.length, "final que no viste", "finales que no viste")}.`,
      weight: 40,
      matchIds: ms.finalsMissed.map((m) => m.id),
    });
  }

  // 4. Rachas.
  const { longestWin, longestUnbeaten, longestWinless, seasonsInARow } = ins.records;
  const sameStreak = longestWin && longestUnbeaten && longestWin.length === longestUnbeaten.length && longestWin.from === longestUnbeaten.from;
  if (longestUnbeaten && longestUnbeaten.length >= 5) {
    push({
      id: "racha-invicta",
      tone: "good",
      title: "Tu racha invicta",
      text: `${longestUnbeaten.length} partidos seguidos sin perder: tu racha más larga fue ${spanLabel(longestUnbeaten.from, longestUnbeaten.to)}.`,
      weight: clamp(55 + longestUnbeaten.length * 2.5),
      matchIds: idsBetween(longestUnbeaten),
    });
  }
  if (longestWin && longestWin.length >= 3 && !(sameStreak && longestUnbeaten!.length >= 5)) {
    push({
      id: "racha-victorias",
      tone: "good",
      title: "Victorias seguidas",
      text: `${longestWin.length} victorias seguidas viéndolas en vivo, ${spanLabel(longestWin.from, longestWin.to)}.`,
      weight: clamp(55 + longestWin.length * 4),
      matchIds: idsBetween(longestWin),
    });
  }
  if (longestWinless && longestWinless.length >= 5) {
    push({
      id: "racha-sin-ganar",
      tone: "bad",
      title: "La sequía",
      text: `${longestWinless.length} partidos seguidos sin ver ganar a ${club}: tu peor sequía fue ${spanLabel(longestWinless.from, longestWinless.to)}.`,
      weight: clamp(52 + longestWinless.length * 2.5),
      matchIds: idsBetween(longestWinless),
    });
  }
  if (seasonsInARow >= 3) {
    push({
      id: "temporadas-seguidas",
      tone: "good",
      title: "Constancia",
      text: `Tu mayor racha de asistencia: ${seasonsInARow} temporadas seguidas yendo al estadio.`,
      weight: clamp(40 + seasonsInARow * 3),
    });
  }

  // 5. Goles.
  const g = ins.goals;
  const biggest = (sign: 1 | -1) =>
    mine.reduce<Match | null>((best, m) => {
      const d = marginFor(m, clubId) * sign;
      return d >= 3 && (!best || d >= marginFor(best, clubId) * sign) ? m : best;
    }, null);
  const bigWin = biggest(1);
  if (g.bigWins > 0 && bigWin) {
    push({
      id: "goleadas-a-favor",
      tone: "good",
      title: "Goleadas vistas",
      text:
        g.bigWins === 1
          ? `Viste una goleada a favor: ${scoreLabel(bigWin)} (${year(bigWin)}).`
          : `Viste ${g.bigWins} goleadas a favor (3 o más goles de diferencia); la más grande fue ${scoreLabel(bigWin)} (${year(bigWin)}).`,
      weight: clamp(48 + g.bigWins * 3 + marginFor(bigWin, clubId)),
      matchIds: [bigWin.id],
    });
  }
  const bigLoss = biggest(-1);
  if (g.bigLosses > 0 && bigLoss) {
    push({
      id: "goleadas-en-contra",
      tone: "bad",
      title: "Goleadas sufridas",
      text:
        g.bigLosses === 1
          ? `Te tocó una goleada en contra: ${scoreLabel(bigLoss)} (${year(bigLoss)}).`
          : `Sufriste ${g.bigLosses} goleadas en contra; la peor fue ${scoreLabel(bigLoss)} (${year(bigLoss)}).`,
      weight: clamp(44 + g.bigLosses * 3 - marginFor(bigLoss, clubId)),
      matchIds: [bigLoss.id],
    });
  }
  if (ins.played >= 10) {
    push({
      id: "promedio-goles",
      tone: "fun",
      title: "Partidos con gol",
      text: `Tus partidos promedian ${dec(g.forPerMatch + g.againstPerMatch)} goles: ${dec(g.forPerMatch)} a favor y ${dec(g.againstPerMatch)} en contra.`,
      weight: 30,
    });
  }
  if (ins.played >= 10 && g.cleanSheets / ins.played >= 0.3) {
    push({
      id: "vallas-invictas",
      tone: "good",
      title: "Valla en cero",
      text: `En ${g.cleanSheets} de tus ${ins.played} partidos (${pct(g.cleanSheets / ins.played)}) ${club} dejó la valla invicta.`,
      weight: 42,
    });
  }
  if (g.goalless >= 3) {
    push({
      id: "ceros",
      tone: "fun",
      title: "Sin goles",
      text: `${g.goalless} de tus partidos terminaron 0-0. Hay que tener paciencia.`,
      weight: 35,
    });
  }
  const hs = g.highestScoring;
  if (hs && hs.homeGoals! + hs.awayGoals! >= 6) {
    push({
      id: "mas-goles",
      tone: "fun",
      title: "Lluvia de goles",
      text: `El partido con más goles que viste: ${scoreLabel(hs)} (${year(hs)}), ${hs.homeGoals! + hs.awayGoals!} en total.`,
      weight: 38,
      matchIds: [hs.id],
    });
  }
  if (g.shootouts.pj >= 1) {
    const s = g.shootouts;
    push({
      id: "penales",
      tone: "fun",
      title: "Definición a penales",
      text:
        s.pj === 1
          ? `Viste una tanda de penales y ${club} ${s.won ? "la ganó" : s.lost ? "la perdió" : "no la definió"}.`
          : `Viste ${s.pj} tandas de penales: ${club} ganó ${s.won} y perdió ${s.lost}.`,
      weight: 36 + s.pj,
      matchIds: mine.filter((m) => m.homePens !== null && m.awayPens !== null && m.homeGoals === m.awayGoals).map((m) => m.id),
    });
  }

  // 6. Finales vistas.
  const finals = mine.filter((m) => m.isFinal);
  if (finals.length > 0) {
    const w = finals.filter((m) => decidedOutcome(m, clubId) === "G").length;
    const l = finals.filter((m) => decidedOutcome(m, clubId) === "P").length;
    push({
      id: "finales-vistas",
      tone: w >= l ? "good" : "bad",
      title: "Finales",
      text: `Viste ${plural(finals.length, "final", "finales")} de ${club}: ${plural(w, "ganada", "ganadas")} y ${plural(l, "perdida", "perdidas")}.`,
      weight: clamp(58 + w * 5),
      matchIds: finals.map((m) => m.id),
    });
  }

  // 7. Local/visita y competencia.
  const homeM = mine.filter((m) => m.homeTeamId === clubId);
  const awayM = mine.filter((m) => m.awayTeamId === clubId);
  if (homeM.length >= 5 && awayM.length >= 5) {
    const h = rated(homeM, clubId).effectiveness;
    const a = rated(awayM, clubId).effectiveness;
    if (Math.abs(h - a) >= 0.15) {
      push({
        id: "local-visita",
        tone: "neutral",
        title: h > a ? "Más fuerte en casa" : "Más fuerte de visita",
        text: `Cuando vas, ${club} rinde ${pct(h)} de local y ${pct(a)} de visita (${homeM.length} y ${awayM.length} partidos).`,
        weight: clamp(50 + Math.abs(h - a) * 30),
      });
    }
  }
  let compPick: { name: string; eff: number; rest: number; pj: number; id: string } | null = null;
  for (const c of ins.competitions) {
    const restM = mine.filter((m) => m.competitionId !== c.competitionId);
    if (c.pj < 5 || restM.length < 5) continue;
    const rest = rated(restM, clubId).effectiveness;
    if (Math.abs(c.effectiveness - rest) >= 0.15 && (!compPick || Math.abs(c.effectiveness - rest) > Math.abs(compPick.eff - compPick.rest))) {
      compPick = { name: c.name, eff: c.effectiveness, rest, pj: c.pj, id: c.competitionId };
    }
  }
  if (compPick) {
    push({
      id: `competencia-${compPick.id}`,
      tone: compPick.eff > compPick.rest ? "good" : "bad",
      title: compPick.eff > compPick.rest ? "Tu torneo favorito" : "Tu torneo difícil",
      text: `En ${compPick.name} ${club} rinde ${pct(compPick.eff)} cuando vas (${compPick.pj} partidos); en el resto, ${pct(compPick.rest)}.`,
      weight: clamp(52 + Math.abs(compPick.eff - compPick.rest) * 35),
      matchIds: mine.filter((m) => m.competitionId === compPick.id).map((m) => m.id),
    });
  }

  // 8. Día de estadio.
  if (ins.played >= 10) {
    const wd = ins.distributions.byWeekday;
    const top = wd.indexOf(Math.max(...wd));
    if (wd[top] / ins.played >= 0.4) {
      push({
        id: "dia-favorito",
        tone: "fun",
        title: "Tu día de estadio",
        text: `Tu día de estadio es el ${WEEKDAY_NAMES[top]}: ${wd[top]} de tus ${ins.played} partidos (${pct(wd[top] / ins.played)}).`,
        weight: 34,
      });
    }
  }

  return out.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id)).slice(0, MAX_HIGHLIGHTS);
}
