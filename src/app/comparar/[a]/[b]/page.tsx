import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { loadDuelo } from "@/lib/comparar.ts";
import { getDb } from "@/lib/db/client.ts";
import { duelPath, duelShareText } from "@/lib/domain/comparar.ts";
import { safeDecode } from "@/lib/repo/users.ts";
import { siteUrl } from "@/lib/site.ts";
import { CaraACara, DueloHeader, EnComun, IdolosVerdugos } from "@/components/comparar/Duelo.tsx";
import { CompartirDuelo } from "@/components/comparar/CompartirDuelo.tsx";
import { CompararBox } from "@/components/comparar/CompararBox.tsx";

type Params = Promise<{ a: string; b: string }>;

const MENSAJES = {
  "sin-sesion": { title: "Ingresa para compararte", text: "Para usar «yo» necesitas tu sesión iniciada.", cta: { href: "/ingresar", label: "Ingresar" } },
  "no-disponible": { title: "Este hincha no tiene su Galería pública", text: "No lo encontramos o prefirió mantener su Galería privada. Pídele que lo haga público para compararse.", cta: null },
  mismo: { title: "Ese eres tú", text: "Compararte contigo mismo es fácil: siempre ganas. Busca a un amigo para picarse.", cta: null },
} as const;

export async function generateMetadata({ params }: { params: Params }) {
  const { a, b } = await params;
  const db = await getDb();
  const r = await loadDuelo(db, a, b);
  if ("error" in r || !r.duelo.shareable) return { title: "Comparar con un amigo · GaluchaStats", robots: { index: false } };
  const { a: fa, b: fb } = r.duelo;
  const path = duelPath(fa.username, fb.username);
  const title = `@${fa.username} vs @${fb.username} · GaluchaStats`;
  const description = duelShareText(fa, fb);
  const images = [{ url: `${path}/imagen`, width: 1200, height: 630 }];
  return {
    title,
    description,
    openGraph: { title, description, images, type: "website" as const },
    twitter: { card: "summary_large_image" as const, title, description, images: images.map((i) => i.url) },
  };
}

export default async function CompararPage({ params }: { params: Params }) {
  const { a, b } = await params;
  const db = await getDb();
  const viewer = await currentUser();
  const r = await loadDuelo(db, a, b);
  if ("error" in r) {
    if (r.error === "no-disponible") notFound();
    const m = MENSAJES[r.error];
    return (
      <div className="card cmp-msg">
        <h1 className="section-title">{m.title}</h1>
        <p className="muted">{m.text}</p>
        {m.cta && (
          <Link className="btn" href={m.cta.href}>
            {m.cta.label}
          </Link>
        )}
      </div>
    );
  }
  const { duelo: d } = r;
  // «yo» se reemplaza por el usuario real: así el link se puede compartir.
  const canonical = duelPath(d.a.username, d.b.username);
  const [ra, rb] = [safeDecode(a).replace(/^@+/, ""), safeDecode(b).replace(/^@+/, "")];
  if (ra.toLowerCase() === "yo" || rb.toLowerCase() === "yo" || ra !== d.a.username || rb !== d.b.username) redirect(canonical);
  const url = `${siteUrl()}${canonical}`;
  const mine = viewer && (viewer.id === d.a.memberId || viewer.id === d.b.memberId);
  return (
    <div className="stack cmp">
      <DueloHeader d={d} />
      <CaraACara d={d} />
      <EnComun d={d} />
      <IdolosVerdugos d={d} />
      {d.shareable ? (
        <CompartirDuelo text={duelShareText(d.a, d.b)} url={url} image={`${canonical}/imagen`} />
      ) : (
        <p className="muted small">Para compartir este cara a cara, los dos carnets tienen que ser públicos.</p>
      )}
      {mine && <CompararBox from={viewer.username} />}
    </div>
  );
}
