import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { loadCarnet } from "@/lib/carnet.ts";
import { getDb } from "@/lib/db/client.ts";
import { getUserByUsername, safeDecode } from "@/lib/repo/users.ts";
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

export default async function FanPage({ params }: { params: Params }) {
  const { username } = await params;
  const db = await getDb();
  const fan = await getUserByUsername(db, safeDecode(username));
  const viewer = await currentUser();
  const isOwner = !!viewer && viewer.id === fan?.id;
  if (!fan || (!fan.isPublic && !isOwner)) notFound();
  return <CarnetView username={fan.username} memberId={fan.id} {...(await loadCarnet(db, fan))} isOwner={isOwner} isPublic={fan.isPublic} />;
}
