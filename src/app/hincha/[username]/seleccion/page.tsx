import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { loadCarnet } from "@/lib/carnet.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getTeam, SELECCION_ID } from "@/lib/repo/teams.ts";
import { getUserByUsername, safeDecode } from "@/lib/repo/users.ts";
import { CarnetView } from "@/components/CarnetView.tsx";
import { shareText } from "@/lib/shareText.ts";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { username } = await params;
  const db = await getDb();
  const fan = await getUserByUsername(db, safeDecode(username));
  if (!fan || !fan.isPublic) return { title: `@${username} · GaluchaStats` };
  const { club, carnet } = await loadCarnet(db, fan, SELECCION_ID);
  const title = `@${fan.username} · Galería de La Roja`;
  const description = shareText(carnet, club.shortName, true);
  const images = [{ url: `/hincha/${encodeURIComponent(fan.username)}/seleccion/tarjeta`, width: 1200, height: 630 }];
  return {
    title: `${title} · GaluchaStats`,
    description,
    openGraph: { title, description, images, type: "profile" as const },
    twitter: { card: "summary_large_image" as const, title, description, images: images.map((i) => i.url) },
  };
}

/** Galería pública de La Roja de un hincha (la de la liga está en /hincha/usuario). */
export default async function FanSeleccionPage({ params }: { params: Params }) {
  const { username } = await params;
  const db = await getDb();
  const fan = await getUserByUsername(db, safeDecode(username));
  const viewer = await currentUser();
  const isOwner = !!viewer && viewer.id === fan?.id;
  if (!fan || (!fan.isPublic && !isOwner)) notFound();
  const team = (await getTeam(db, SELECCION_ID))!;
  const data = await loadCarnet(db, fan, SELECCION_ID);
  return (
    <div className="stack mode-seleccion" style={clubStyle(clubIdentity(team)) as React.CSSProperties}>
      <p className="small" style={{ margin: 0 }}>
        Galería de <strong>La Roja</strong> de @{fan.username} · <Link href={`/hincha/${encodeURIComponent(fan.username)}`}>ver su Galería de la liga</Link>
      </p>
      <CarnetView username={fan.username} memberId={fan.id} {...data} isOwner={isOwner} isPublic={fan.isPublic} community={null} national />
    </div>
  );
}
