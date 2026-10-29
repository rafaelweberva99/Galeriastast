import { notFound } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { loadCarnet } from "@/lib/carnet.ts";
import { getDb } from "@/lib/db/client.ts";
import { getUserByUsername } from "@/lib/repo/users.ts";
import { CarnetView } from "@/components/CarnetView.tsx";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { username } = await params;
  return { title: `@${username} · GaluchaStats` };
}

export default async function FanPage({ params }: { params: Params }) {
  const { username } = await params;
  const db = await getDb();
  const fan = await getUserByUsername(db, decodeURIComponent(username));
  const viewer = await currentUser();
  const isOwner = !!viewer && viewer.id === fan?.id;
  if (!fan || (!fan.isPublic && !isOwner)) notFound();
  return <CarnetView username={fan.username} memberId={fan.id} {...(await loadCarnet(db, fan))} isOwner={isOwner} />;
}
