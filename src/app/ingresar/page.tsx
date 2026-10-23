import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth.ts";
import { LoginForm } from "./LoginForm.tsx";

export const metadata = { title: "Ingresar · GaleríaStats" };

export default async function LoginPage() {
  if (await currentUser()) redirect("/carnet");
  return (
    <div className="card" style={{ maxWidth: 480, margin: "24px auto" }}>
      <h1>Ingresar</h1>
      <LoginForm />
    </div>
  );
}
