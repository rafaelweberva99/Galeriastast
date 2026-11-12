import { currentUser } from "@/lib/auth.ts";
import { loadCarnet } from "@/lib/carnet.ts";
import { clubIdentity } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { SELECCION_ID } from "@/lib/repo/teams.ts";
import { getUserByUsername, safeDecode } from "@/lib/repo/users.ts";
import { shareCardImage } from "@/lib/shareCard.tsx";
import { siteUrl } from "@/lib/site.ts";

/** Imagen de la Galería de La Roja para compartir. Pública si el perfil es público; si no, solo para su dueño. */
export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = await getDb();
  const fan = await getUserByUsername(db, safeDecode(username));
  const viewer = fan && !fan.isPublic ? await currentUser() : null;
  if (!fan || (!fan.isPublic && viewer?.id !== fan.id)) return new Response("No encontrado", { status: 404 });
  const { club, carnet } = await loadCarnet(db, fan, SELECCION_ID);
  const image = await shareCardImage({
    username: fan.username,
    memberId: fan.id,
    club: clubIdentity(club),
    clubName: club.name,
    carnet,
    site: siteUrl(),
    national: true,
  });
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", fan.isPublic ? "public, max-age=600" : "private, no-store");
  if (new URL(req.url).searchParams.has("descargar")) {
    headers.set("Content-Disposition", `attachment; filename="galuchastats-${fan.username}-la-roja.png"`);
  }
  return new Response(image.body, { status: 200, headers });
}
