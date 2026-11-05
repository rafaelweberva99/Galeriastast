import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getUserByUsername, safeDecode } from "@/lib/repo/users.ts";
import { loadResumen, resumenShareText } from "@/lib/resumen.ts";
import { siteUrl } from "@/lib/site.ts";
import { CtaCrear, ResumenDeck } from "@/components/resumen/ResumenDeck.tsx";
import { ResumenShare } from "@/components/resumen/ResumenShare.tsx";

type Params = Promise<{ username: string; year: string }>;

const parseYear = (y: string) => (/^\d{4}$/.test(y) && Number(y) >= 1990 && Number(y) <= 2100 ? Number(y) : null);

export async function generateMetadata({ params }: { params: Params }) {
  const { username, year: y } = await params;
  const year = parseYear(y);
  const db = await getDb();
  const fan = await getUserByUsername(db, safeDecode(username));
  if (!fan || !fan.isPublic || !year) return { title: `Tu año en la galería · GaluchaStats`, robots: { index: false } };
  const { club, resumen } = await loadResumen(db, fan, year);
  if (!resumen.played) return { title: `@${fan.username} · ${year} · GaluchaStats`, robots: { index: false } };
  const title = `@${fan.username} · Su ${year} en la galería`;
  const description = resumenShareText(resumen, club.shortName);
  const images = [{ url: `/hincha/${encodeURIComponent(fan.username)}/resumen/${year}/imagen`, width: 1080, height: 1350 }];
  return {
    title: `${title} · GaluchaStats`,
    description,
    openGraph: { title, description, images, type: "profile" as const },
    twitter: { card: "summary_large_image" as const, title, description, images: images.map((i) => i.url) },
  };
}

export default async function ResumenPage({ params }: { params: Params }) {
  const { username, year: y } = await params;
  const year = parseYear(y);
  const db = await getDb();
  const fan = await getUserByUsername(db, safeDecode(username));
  const viewer = await currentUser();
  const isOwner = !!viewer && viewer.id === fan?.id;
  // Misma regla que /hincha/[username]: perfil público, o su dueño.
  if (!fan || !year || (!fan.isPublic && !isOwner)) notFound();

  const { club, resumen, years } = await loadResumen(db, fan, year);
  const identity = clubIdentity(club);
  const base = `/hincha/${encodeURIComponent(fan.username)}`;
  const yearNav = years.length > 0 && (
    <nav className="rs-years" aria-label="Año del resumen">
      {[...new Set([...years, year])]
        .sort((a, b) => b - a)
        .map((yy) => (
          <Link key={yy} href={`${base}/resumen/${yy}`} aria-current={yy === year ? "page" : undefined} className={yy === year ? "on" : undefined}>
            {yy}
          </Link>
        ))}
    </nav>
  );

  if (resumen.played === 0) {
    return (
      <div className="stack" style={clubStyle(identity) as React.CSSProperties}>
        <div className="card rs-empty">
          <h1 style={{ margin: 0 }}>Aún no hay partidos en {year}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {isOwner ? `Todavía no marcas partidos de ${club.shortName} en ${year}.` : `@${fan.username} no tiene partidos de ${club.shortName} en ${year}.`}
            {years.length > 0 ? " Mira otro año:" : ""}
          </p>
          {yearNav}
          <div className="share-actions">
            {isOwner ? (
              <Link className="btn" href="/partidos">
                Marcar partidos
              </Link>
            ) : (
              <Link className="btn" href={base}>
                Ver el carnet de @{fan.username}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  const url = `${siteUrl()}${base}/resumen/${year}`;
  return (
    <div className="stack" style={clubStyle(identity) as React.CSSProperties}>
      <header className="rs-head">
        <div>
          <p className="rs-head-k">@{fan.username} · {club.name}</p>
          <h1 style={{ margin: 0 }}>{isOwner ? "Tu año" : "Su año"} en la galería {year}</h1>
        </div>
        {yearNav}
      </header>
      <ResumenDeck username={fan.username} club={identity} clubName={club.name} r={resumen} cta={isOwner ? <ShareAnchor /> : <CtaCrear />} />
      <ResumenShare image={`${base}/resumen/${year}/imagen`} text={resumenShareText(resumen, club.shortName)} url={url} isPublic={fan.isPublic} year={year} />
      <p className="muted small" style={{ textAlign: "center" }}>
        Estadísticas solo para entretención. Cuentan los partidos de {club.shortName} que marcaste con fecha de {year}.
      </p>
    </div>
  );
}

function ShareAnchor() {
  return (
    <a className="btn rs-btn" href="#rs-share-title">
      Compartir mi año
    </a>
  );
}
