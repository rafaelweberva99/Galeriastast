import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client.ts";
import { verifyUnsubscribeToken } from "@/lib/mailTemplates.ts";
import { optOutReminders } from "@/lib/repo/emails.ts";

export const metadata = { title: "No recibir recordatorios · GaluchaStats", robots: { index: false } };

async function unsubscribe(form: FormData) {
  "use server";
  const id = verifyUnsubscribeToken(String(form.get("t") ?? ""));
  if (id) await optOutReminders(await getDb(), id);
  redirect(`/baja?t=${encodeURIComponent(String(form.get("t") ?? ""))}&ok=1`);
}

/** Baja de los recordatorios por correo. El enlace del correo solo muestra el botón: confirmar es un POST. */
export default async function BajaPage({ searchParams }: { searchParams: Promise<{ t?: string; ok?: string }> }) {
  const { t = "", ok } = await searchParams;
  const valid = (() => {
    try {
      return verifyUnsubscribeToken(t) !== null;
    } catch {
      return false;
    }
  })();
  return (
    <div className="card stack" style={{ maxWidth: 520, margin: "0 auto" }}>
      <h1>No recibir recordatorios</h1>
      {valid && ok ? (
        <p>Listo: no te enviaremos más recordatorios. Tu cuenta sigue igual.</p>
      ) : valid ? (
        <form action={unsubscribe} className="stack">
          <input type="hidden" name="t" value={t} />
          <p>
            Dejaremos de enviarte recordatorios por correo. Tu cuenta y tus partidos no cambian. Si cambias de opinión, puedes
            seguir marcando partidos cuando quieras.
          </p>
          <button className="btn">Confirmar: no quiero recordatorios</button>
        </form>
      ) : (
        <p className="muted">Este enlace no es válido o está incompleto.</p>
      )}
    </div>
  );
}
