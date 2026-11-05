import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { AuthPerks } from "@/components/AuthPerks.tsx";
import { LoginForm } from "./LoginForm.tsx";

export const metadata = { title: "Ingresar · GaluchaStats" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sesiones?: string }> }) {
  if (await currentUser()) redirect("/carnet");
  const { sesiones } = await searchParams;
  return (
    <div className="auth-grid">
    <div className="card auth-card">
      <h1>Ingresar</h1>
      {sesiones === "cerradas" && (
        <p className="notice success">Cerramos tu sesión en todos tus dispositivos. Vuelve a ingresar cuando quieras.</p>
      )}
      <LoginForm />
    </div>
    <AuthPerks />
    </div>
  );
}
