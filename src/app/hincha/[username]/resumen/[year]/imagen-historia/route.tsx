import { currentUser } from "@/lib/auth.ts";
import { clubIdentity } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getUserByUsername, safeDecode } from "@/lib/repo/users.ts";
import { loadResumen } from "@/lib/resumen.ts";
import { siteUrl } from "@/lib/site.ts";
import { storyImage } from "@/components/resumen/ImageStory.tsx";

/** Imagen vertical 1080×1920 (historias) del resumen anual. Pública si el carnet es público; si no, solo para su dueño. */
export async function GET(req: Request, { params }: { params: Promise<{ username: string; year: string }> }) {
  const { username, year: y } = await params;
  const year = /^\d{4}$/.test(y) ? Number(y) : null;
  const db = await getDb();
  const fan = await getUserByUsername(db, safeDecode(username));
  const viewer = fan && !fan.isPublic ? await currentUser() : null;
  if (!fan || !year || (!fan.isPublic && viewer?.id !== fan.id)) return new Response("No encontrado", { status: 404 });
  const { club, resumen } = await loadResumen(db, fan, year);
  if (resumen.played === 0) return new Response(`Sin partidos en ${year}`, { status: 404 });
  const image = await storyImage({ username: fan.username, club: clubIdentity(club), clubName: club.name, r: resumen, site: siteUrl() });
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", fan.isPublic ? "public, max-age=600" : "private, no-store");
  if (new URL(req.url).searchParams.has("descargar")) {
    headers.set("Content-Disposition", `attachment; filename="galuchastats-${fan.username}-${year}-historia.png"`);
  }
  return new Response(image.body, { status: 200, headers });
}
