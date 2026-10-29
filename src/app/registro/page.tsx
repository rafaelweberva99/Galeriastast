import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getTeam, listClubs } from "@/lib/repo/teams.ts";
import { visibleClubs } from "@/lib/mvp.ts";
import { Jersey } from "@/components/Jersey.tsx";
import { RegisterForm } from "./RegisterForm.tsx";

export const metadata = { title: "Crear carnet · GaluchaStats" };

type Search = Promise<{ club?: string }>;

export default async function RegisterPage({ searchParams }: { searchParams: Search }) {
  if (await currentUser()) redirect("/carnet");
  const db = await getDb();
  const clubs = visibleClubs(await listClubs(db)).map((c) => ({ id: c.id, name: c.name }));
  const { club: clubParam } = await searchParams;
  const team = clubParam ? await getTeam(db, clubParam) : null;
  const club = team && clubs.some((c) => c.id === team.id) ? clubIdentity(team) : null;

  return (
    <div style={{ maxWidth: 520, margin: "24px auto", ...(club ? clubStyle(club) : {}) } as React.CSSProperties} className="stack">
      {club && (
        <div className="club-banner row">
          <Jersey club={club} size={72} number="12" />
          <div>
            <div className="small">Carnet de hincha</div>
            <h1>{club.nickname}</h1>
            <div className="display" style={{ fontSize: "1.1rem" }}>
              {club.cheer}
            </div>
          </div>
        </div>
      )}
      <div className="card">
        {!club && <h1>Crea tu carnet de hincha</h1>}
        <p className="muted">Solo podrás marcar partidos de tu club. El 12 de la camiseta eres tú: la hinchada.</p>
        <RegisterForm clubs={clubs} defaultClub={club?.id ?? ""} />
      </div>
    </div>
  );
}
