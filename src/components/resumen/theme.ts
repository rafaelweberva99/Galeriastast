import { luminance, mix, type ClubIdentity } from "@/lib/clubTheme.ts";
import type { Outcome } from "@/lib/domain/types.ts";

/** Colores del resumen: fondo oscuro teñido con el club y un color de resalte que contraste con él. */
export function resumenTheme(club: ClubIdentity) {
  const bg = luminance(club.colors.primary) > 0.35 ? mix(club.colors.primary, -0.7) : mix(club.colors.primary, -0.55);
  const candidates = [club.colors.accent, club.colors.secondary, club.colors.primary, "#ffd84a"];
  const hi = candidates.find((c) => luminance(c) > 0.3 && Math.abs(luminance(c) - luminance(bg)) > 0.25) ?? "#ffd84a";
  return { bg, bgDeep: mix(bg, -0.45), hi, hiInk: luminance(hi) > 0.45 ? "#111111" : "#ffffff" };
}

export const OUTCOME_COLOR: Record<Outcome, string> = { G: "#3fbf7f", E: "#e0b93a", P: "#ef6464" };

/** Texto para el motivo de "partido del año". */
export const REASON_LABEL = {
  final: "Una final",
  clasico: "Un clásico",
  goleada: "Una goleada",
  goles: "El partido con más goles",
  unico: "El único del año",
} as const;

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "+3" / "−2" / "igual". */
export function signed(n: number): string {
  const r = Math.round(n);
  return r === 0 ? "0" : r > 0 ? `+${r}` : `−${Math.abs(r)}`;
}
