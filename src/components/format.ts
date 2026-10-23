import type { Match, TeamRecord } from "@/lib/domain/types.ts";

const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(`${iso}T00:00:00Z`));
}

export function pct(value: number | null, digits = 0): string {
  return value === null ? "—" : `${value.toFixed(digits)}%`;
}

export function scoreLine(m: Match): string {
  if (m.homeGoals === null || m.awayGoals === null) {
    return m.homePens !== null ? `pen. ${m.homePens}-${m.awayPens}` : "vs";
  }
  const pens = m.homePens !== null ? ` (${m.homePens}-${m.awayPens} pen.)` : "";
  return `${m.homeGoals}-${m.awayGoals}${pens}`;
}

export function recordLine(r: TeamRecord): string {
  return `${r.won}G ${r.drawn}E ${r.lost}P`;
}
