import type { Match, TeamRecord } from "@/lib/domain/types.ts";

const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(`${iso}T00:00:00Z`));
}

export function pct(value: number | null, digits = 0): string {
  return value === null ? "—" : `${value.toFixed(digits)}%`;
}

/** Partido sin marcador: "vs" si está por jugarse, "s/r" si ya pasó (suspendido y nunca terminado). */
export function noResult(m: Match): string {
  return m.date < new Date().toISOString().slice(0, 10) ? "s/r" : "vs";
}

export function scoreLine(m: Match): string {
  if (m.homeGoals === null || m.awayGoals === null) {
    return m.homePens !== null ? `pen. ${m.homePens}-${m.awayPens}` : noResult(m);
  }
  const pens = m.homePens !== null ? ` (${m.homePens}-${m.awayPens} pen.)` : "";
  return `${m.homeGoals}-${m.awayGoals}${pens}`;
}

export function recordLine(r: TeamRecord): string {
  return `${r.won}G ${r.drawn}E ${r.lost}P`;
}
