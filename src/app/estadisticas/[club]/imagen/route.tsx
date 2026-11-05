import { clubIdentity } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { clubCommunityDetail } from "@/lib/repo/community.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { isVisibleClub } from "@/lib/mvp.ts";
import { siteUrl } from "@/lib/site.ts";
import { clubOgImage } from "@/components/community/ClubOgImage.tsx";

/** Imagen OG 1200×630 de la hinchada de un club. Solo usa agregados públicos (con el mínimo de hinchas). */
export async function GET(_req: Request, { params }: { params: Promise<{ club: string }> }) {
  const { club } = await params;
  const db = await getDb();
  const team = await getTeam(db, club);
  if (!team || !isVisibleClub(team.id)) return new Response("No encontrado", { status: 404 });
  const d = await clubCommunityDetail(db, team.id);
  const open = d.avgEffectiveness !== null;
  const image = await clubOgImage({
    club: clubIdentity(team),
    kicker: "Hinchada en GaluchaStats",
    title: team.shortName,
    figure: open ? `${Math.round(d.avgEffectiveness!)}%` : String(d.fans),
    caption: open ? `Mufómetro medio · ${d.fans} hinchas` : d.fans === 1 ? "hincha con perfil público" : "hinchas con perfil público",
    site: siteUrl(),
  });
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", "public, max-age=600");
  return new Response(image.body, { status: 200, headers });
}
