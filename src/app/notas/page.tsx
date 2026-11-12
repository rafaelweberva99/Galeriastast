import Link from "next/link";
import { requireUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { notesEnabled } from "@/lib/notesCrypto.ts";
import { listNotes } from "@/lib/repo/notes.ts";
import { formatDate } from "@/components/format.ts";

export const metadata = { title: "Mis notas · GaluchaStats", robots: { index: false } };

export default async function NotasPage() {
  const user = await requireUser();
  const db = await getDb();
  const notes = await listNotes(db, user.id);
  return (
    <div className="stack" style={{ maxWidth: 680, margin: "24px auto" }}>
      <div className="card stack">
        <h1 style={{ margin: 0 }}>Mis notas</h1>
        <p className="muted" style={{ margin: 0 }}>
          Lo que escribes sobre cada partido es solo tuyo: se guarda cifrado, no aparece en tu Galería pública y no se ve en el
          panel de administración. Las notas se escriben en <Link href="/partidos">Partidos</Link>.
        </p>
      </div>
      {!notesEnabled() ? (
        <p className="muted">Las notas todavía no están disponibles.</p>
      ) : notes.length === 0 ? (
        <p className="muted">Aún no tienes notas. Entra a Partidos y toca «Agregar nota» en un partido que ya se jugó.</p>
      ) : (
        notes.map((n) => (
          <article key={n.matchId} className="card stack" style={{ gap: 6 }}>
            <div className="small muted">{formatDate(n.date)}</div>
            <strong>
              {n.home} {n.homeGoals ?? "?"}–{n.awayGoals ?? "?"} {n.away}
            </strong>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{n.text}</p>
          </article>
        ))
      )}
    </div>
  );
}
