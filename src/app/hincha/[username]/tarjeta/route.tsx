import { currentUser } from "@/lib/auth.ts";
import { loadCarnet } from "@/lib/carnet.ts";
import { clubIdentity } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getUserByUsername } from "@/lib/repo/users.ts";
import { shareCardImage } from "@/lib/shareCard.tsx";
import { siteUrl } from "@/lib/site.ts";

/** Imagen del carnet para compartir. Pública si el carnet es público; si no, solo para su dueño. */
export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const db = await getDb();
  const fan = await getUserByUsername(db, decodeURIComponent(username));
  const viewer = fan && !fan.isPublic ? await currentUser() : null;
  if (!fan || (!fan.isPublic && viewer?.id !== fan.id)) return new Response("No encontrado", { status: 404 });
  const { club, carnet } = await loadCarnet(db, fan);
  const image = shareCardImage({ username: fan.username, club: clubIdentity(club), clubName: club.name, carnet, site: siteUrl() });
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", fan.isPublic ? "public, max-age=600" : "private, no-store");
  if (new URL(req.url).searchParams.has("descargar")) {
    headers.set("Content-Disposition", `attachment; filename="galuchastats-${fan.username}.png"`);
  }
  return new Response(image.body, { status: 200, headers });
}
