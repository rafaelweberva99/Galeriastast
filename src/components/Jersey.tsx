import { jerseySvg, type ClubIdentity } from "@/lib/clubTheme.ts";

/** Camiseta genérica con los colores del club. `number` se dibuja en el pecho (el 12 es la hinchada). */
export function Jersey({ club, size = 48, number }: { club: ClubIdentity; size?: number; number?: string }) {
  return (
    <span
      style={{ display: "inline-flex", flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: jerseySvg(club, size, number) }}
    />
  );
}
