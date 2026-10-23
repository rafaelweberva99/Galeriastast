import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { listClubs } from "@/lib/repo/teams.ts";
import { RegisterForm } from "./RegisterForm.tsx";

export const metadata = { title: "Crear carnet · GaleríaStats" };

export default async function RegisterPage() {
  if (await currentUser()) redirect("/carnet");
  const clubs = listClubs(getDb()).map((c) => ({ id: c.id, name: c.name }));
  return (
    <div className="card" style={{ maxWidth: 480, margin: "24px auto" }}>
      <h1>Crea tu carnet de hincha</h1>
      <p className="muted">Elige tu club: solo podrás marcar partidos de ese equipo.</p>
      <RegisterForm clubs={clubs} />
    </div>
  );
}
