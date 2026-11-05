import { loadDuelo } from "@/lib/comparar.ts";
import { getDb } from "@/lib/db/client.ts";
import { duelImage } from "@/lib/compararImage.tsx";
import { siteUrl } from "@/lib/site.ts";

/** Imagen 1200×630 del cara a cara. Pública solo si los dos carnets lo son. */
export async function GET(req: Request, { params }: { params: Promise<{ a: string; b: string }> }) {
  const { a, b } = await params;
  const r = await loadDuelo(await getDb(), a, b);
  if ("error" in r) return new Response("No encontrado", { status: 404 });
  const { duelo: d } = r;
  const image = await duelImage(d, siteUrl());
  const headers = new Headers(image.headers);
  headers.set("Cache-Control", d.shareable ? "public, max-age=600" : "private, no-store");
  if (new URL(req.url).searchParams.has("descargar")) {
    headers.set("Content-Disposition", `attachment; filename="galuchastats-${d.a.username}-vs-${d.b.username}.png"`);
  }
  return new Response(image.body, { status: 200, headers });
}
