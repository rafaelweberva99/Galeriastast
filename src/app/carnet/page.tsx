import Link from "next/link";
import { requireUser } from "@/lib/auth.ts";
import { loadCarnet, loadSuma, parseClubView } from "@/lib/carnet.ts";
import { getDb } from "@/lib/db/client.ts";
import { communityComparison } from "@/lib/repo/community.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { getSecondClubId } from "@/lib/repo/users.ts";
import { CarnetView } from "@/components/CarnetView.tsx";
import { ClubSwitch } from "@/components/carnet/ClubSwitch.tsx";
import { SumaView } from "@/components/carnet/SumaView.tsx";

export const metadata = { title: "Mi Galería · GaluchaStats" };

export default async function MyCarnetPage({ searchParams }: { searchParams: Promise<{ club?: string }> }) {
  const user = await requireUser();
  const db = await getDb();
  const secondId = await getSecondClubId(db, user.id);
  const view = parseClubView((await searchParams).club, !!secondId);
  const [mainTeam, secondTeam] = await Promise.all([getTeam(db, user.clubId), secondId ? getTeam(db, secondId) : null]);
  const intro = user.isPublic && (
    <p className="muted small">
      Tu Galería es pública en <Link href={`/hincha/${user.username}`}>/hincha/{user.username}</Link>. Puedes cambiarlo en tu{" "}
      <Link href="/perfil">perfil</Link>.
    </p>
  );
  const switcher = secondTeam && mainTeam && <ClubSwitch base="/carnet" view={view} main={mainTeam.shortName} second={secondTeam.shortName} />;
  if (view === "suma" && secondId) {
    const { main, second, suma } = await loadSuma(db, user, secondId);
    return (
      <div className="stack">
        {intro}
        {switcher}
        <SumaView username={user.username} main={main} second={second} suma={suma} />
      </div>
    );
  }
  const data = await loadCarnet(db, user, view === "segundo" && secondId ? secondId : user.clubId);
  const community = view === "principal" ? await communityComparison(db, user.id) : null;
  return (
    <div className="stack">
      {intro}
      {switcher}
      <CarnetView username={user.username} memberId={user.id} {...data} isOwner isPublic={user.isPublic} community={community} />
    </div>
  );
}
