import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { LoginForm } from "./LoginForm.tsx";

export const metadata = { title: "Ingresar · GaleríaStats" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sesiones?: string }> }) {
  if (await currentUser()) redirect("/carnet");
  const { sesiones } = await searchParams;
  return (
    <div className="card" style={{ maxWidth: 480, margin: "24px auto" }}>
      <h1>Ingresar</h1>
      {sesiones === "cerradas" && (
        <p className="notice success">Cerramos tu sesión en todos tus dispositivos. Vuelve a ingresar cuando quieras.</p>
      )}
      <LoginForm />
    </div>
  );
}
