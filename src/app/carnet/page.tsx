import Link from "next/link";
import { requireUser } from "@/lib/auth.ts";
import { loadCarnet } from "@/lib/carnet.ts";
import { getDb } from "@/lib/db/client.ts";
import { CarnetView } from "@/components/CarnetView.tsx";

export const metadata = { title: "Mi carnet · GaleríaStats" };

export default async function MyCarnetPage() {
  const user = await requireUser();
  const data = loadCarnet(getDb(), user);
  return (
    <div className="stack">
      {user.isPublic && (
        <p className="muted small">
          Tu carnet es público en <Link href={`/hincha/${user.username}`}>/hincha/{user.username}</Link>. Puedes
          cambiarlo en tu <Link href="/perfil">perfil</Link>.
        </p>
      )}
      <CarnetView username={user.username} memberId={user.id} {...data} isOwner />
    </div>
  );
}
