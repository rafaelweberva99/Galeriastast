/** Utilidades puras del carnet v2 (agrupar, colorear, formatear). Sin React para poder probarlas. */
import type { Outcome } from "@/lib/domain/types.ts";

export type Zone = "win" | "draw" | "loss";

/** Zona del Mufómetro para una efectividad de 0 a 1: más de 60 % cábala, menos de 40 % yeta. */
export function zoneOf(eff: number): Zone {
  return eff > 0.6 ? "win" : eff < 0.4 ? "loss" : "draw";
}

export const zoneVar = (z: Zone) => `var(--${z})`;

export const OUTCOME_ZONE: Record<Outcome, Zone> = { G: "win", E: "draw", P: "loss" };

/** 0.5714 -> "57%". */
export function pct01(v: number | null | undefined, digits = 0): string {
  return v === null || v === undefined ? "—" : `${(v * 100).toFixed(digits).replace(".", ",")}%`;
}

/** Diferencia en puntos porcentuales con signo: 18.2 -> "+18", -9 -> "−9". */
export function signed(v: number | null | undefined, digits = 0): string {
  if (v === null || v === undefined) return "—";
  const s = Math.abs(v).toFixed(digits).replace(".", ",");
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

/** Agrupa por temporada, la más reciente primero (el orden interno se conserva). */
export function groupBySeason<T extends { season: number }>(items: T[]): { season: number; items: T[] }[] {
  const map = new Map<number, T[]>();
  for (const it of items) {
    const list = map.get(it.season);
    if (list) list.push(it);
    else map.set(it.season, [it]);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([season, list]) => ({ season, items: list }));
}

export const MONTHS_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MONTHS_LETTER = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const WEEKDAYS_FULL = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Índice del mayor valor, o -1 si todos son 0. */
export function argMax(values: number[]): number {
  let best = -1;
  let max = 0;
  values.forEach((v, i) => {
    if (v > max) {
      max = v;
      best = i;
    }
  });
  return best;
}

/** Posiciones x de las etiquetas de un eje, sin que se encimen (mínimo `gap` px entre una y otra). */
export function spacedLabels(items: { x: number; text: string }[], gap: number): { x: number; text: string }[] {
  const out: { x: number; text: string }[] = [];
  let last = -Infinity;
  for (const it of items) {
    if (it.x - last >= gap) {
      out.push(it);
      last = it.x;
    }
  }
  return out;
}
