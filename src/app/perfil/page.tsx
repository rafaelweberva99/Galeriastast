import { requireUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { listClubs } from "@/lib/repo/teams.ts";
import { ProfileForm } from "./ProfileForm.tsx";

export const metadata = { title: "Perfil · GaleríaStats" };

export default async function ProfilePage() {
  const user = await requireUser();
  const clubs = listClubs(getDb()).map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="card" style={{ maxWidth: 480, margin: "24px auto" }}>
      <h1>@{user.username}</h1>
      <p className="muted">Si cambias de club, solo se contarán los partidos marcados que involucren a tu nuevo club.</p>
      <ProfileForm clubs={clubs} clubId={user.clubId} isPublic={user.isPublic} />
    </div>
  );
}
