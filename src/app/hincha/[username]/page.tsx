import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { loadCarnet, loadSuma, parseClubView } from "@/lib/carnet.ts";
import { getDb } from "@/lib/db/client.ts";
import { communityComparison } from "@/lib/repo/community.ts";
import { getSecondClubId, getUserByUsername, safeDecode } from "@/lib/repo/users.ts";
import { ClubSwitch } from "@/components/carnet/ClubSwitch.tsx";
import { getTeam } from "@/lib/repo/teams.ts";
import { CarnetView } from "@/components/CarnetView.tsx";
import { shareText } from "@/lib/shareText.ts";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { username } = await params;
  const db = await getDb();
  const fan = await getUserByUsername(db, safeDecode(username));
  if (!fan || !fan.isPublic) return { title: `@${username} · GaluchaStats` };
  const { club, carnet } = await loadCarnet(db, fan);
  const title = `@${fan.username} · Carnet de hincha de ${club.name}`;
  const description = shareText(carnet, club.shortName);
  const images = [{ url: `/hincha/${encodeURIComponent(fan.username)}/tarjeta`, width: 1200, height: 630 }];
  return {
    title: `${title} · GaluchaStats`,
    description,
    openGraph: { title, description, images, type: "profile" as const },
    twitter: { card: "summary_large_image" as const, title, description, images: images.map((i) => i.url) },
  };
}

export default async function FanPage({ params, searchParams }: { params: Params; searchParams: Promise<{ club?: string }> }) {
  const { username } = await params;
  const db = await getDb();
  const fan = await getUserByUsername(db, safeDecode(username));
  const viewer = await currentUser();
  const isOwner = !!viewer && viewer.id === fan?.id;
  if (!fan || (!fan.isPublic && !isOwner)) notFound();
  const secondId = await getSecondClubId(db, fan.id);
  const view = parseClubView((await searchParams).club, !!secondId);
  const [mainTeam, secondTeam] = await Promise.all([getTeam(db, fan.clubId), secondId ? getTeam(db, secondId) : null]);
  const base = `/hincha/${encodeURIComponent(fan.username)}`;
  const sumaData = secondId ? await loadSuma(db, fan, secondId) : null;
  const switcher = secondTeam && mainTeam && sumaData && (
    <ClubSwitch base={base} view={view} main={mainTeam.shortName} second={secondTeam.shortName} suma={sumaData.suma} mainColor={mainTeam.colorPrimary} secondColor={secondTeam.colorPrimary} />
  );
  const community =
    view === "principal" ? await communityComparison(db, fan.id) : view === "segundo" && secondId ? await communityComparison(db, fan.id, secondId) : null;
  const data =
    view === "suma" && secondId
      ? await loadCarnet(db, fan, fan.clubId, secondId)
      : await loadCarnet(db, fan, view === "segundo" && secondId ? secondId : fan.clubId);
  return (
    <div className="stack">
      <p className="small" style={{ margin: 0 }}>
        <Link href={`/hincha/${encodeURIComponent(fan.username)}/seleccion`}>Ver también su Galería de La Roja →</Link>
      </p>
      {switcher}
      <CarnetView username={fan.username} memberId={fan.id} {...data} isOwner={isOwner} isPublic={fan.isPublic} community={community} />
    </div>
  );
}
