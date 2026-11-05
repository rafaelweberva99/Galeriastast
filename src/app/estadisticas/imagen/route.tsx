import { getDb } from "@/lib/db/client.ts";
import { communityOverview } from "@/lib/repo/community.ts";
import { siteUrl } from "@/lib/site.ts";
import { clubOgImage } from "@/components/community/ClubOgImage.tsx";

/** Imagen OG 1200×630 de /estadisticas: hinchas y partidos marcados de la comunidad (agregado público). */
export async function GET() {
  const o = await communityOverview(await getDb());
  const image = await clubOgImage({
    club: null,
    kicker: "Estadísticas de la comunidad",
    title: "¿Cómo está tu hinchada?",
    figure: o.totalAttended !== null ? o.totalAttended.toLocaleString("es-CL") : String(o.totalFans),
    caption: o.totalAttended !== null ? `partidos marcados por ${o.totalFans} hinchas` : "hinchas con perfil público",
    site: siteUrl(),
  });
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", "public, max-age=600");
  return new Response(image.body, { status: 200, headers });
}
