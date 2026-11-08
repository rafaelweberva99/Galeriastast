import Link from "next/link";
import { requireUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { countMarked } from "@/lib/repo/onboarding.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { clubTicketing } from "@/lib/ticketing.ts";
import { Jersey } from "@/components/Jersey.tsx";

export const metadata = { title: "Carga tus partidos · GaluchaStats" };

/** Paso 2 del registro: lo único que falta para ver el carnet es marcar partidos. Tres caminos, el más corto primero. */
export default async function WelcomePage() {
  const user = await requireUser();
  const db = await getDb();
  const [team, marked] = await Promise.all([getTeam(db, user.clubId), countMarked(db, user.id)]);
  const club = team ? clubIdentity(team) : null;
  const ticketera = clubTicketing(user.clubId)?.provider?.name ?? "la ticketera de tu club";
  return (
    <div className="stack welcome" style={(club ? clubStyle(club) : {}) as React.CSSProperties}>
      <ol className="steps-mini" aria-label="Pasos">
        <li className="done">1 · Cuenta creada ✓</li>
        <li className="now">2 · Carga tus partidos</li>
        <li>3 · Mira tu carnet</li>
      </ol>
      <div className="club-banner row">
        {club && <Jersey club={club} size={72} number="12" />}
        <div>
          <div className="small">¡Bienvenido, @{user.username}!</div>
          <h1>{marked > 0 ? `Ya tienes ${marked} ${marked === 1 ? "partido" : "partidos"}` : "Ahora carga tus partidos"}</h1>
          <p style={{ margin: 0 }}>Tu carnet se arma con los partidos a los que fuiste al estadio. Elige cómo cargarlos:</p>
        </div>
      </div>

      <div className="welcome-grid">
        <Link href="/importar" className="welcome-card recommended">
          <span className="welcome-tag">Más rápido</span>
          <span className="welcome-ico" aria-hidden="true">🎟️</span>
          <strong>Subir una captura de {ticketera}</strong>
          <span className="muted">Toma una captura de tus compras y la app marca los partidos sola. También sirve un PDF o el correo de la entrada.</span>
          <span className="btn">Subir captura</span>
        </Link>
        <Link href="/partidos" className="welcome-card">
          <span className="welcome-ico" aria-hidden="true">✅</span>
          <strong>Marcarlos a mano</strong>
          <span className="muted">Ves los partidos de tu club por temporada y tocas “Fui” en los que estuviste.</span>
          <span className="btn btn-ghost">Marcar partidos</span>
        </Link>
        <Link href="/importar#planilla" className="welcome-card">
          <span className="welcome-ico" aria-hidden="true">📋</span>
          <strong>Pegar mi Excel</strong>
          <span className="muted">Si ya llevas la lista de partidos en una planilla, la copias y la pegas.</span>
          <span className="btn btn-ghost">Pegar planilla</span>
        </Link>
      </div>

      <p className="muted small" style={{ textAlign: "center" }}>
        {marked > 0 ? (
          <>
            <Link href="/carnet">Ver mi carnet →</Link>
          </>
        ) : (
          <>
            ¿Prefieres hacerlo después? <Link href="/carnet">Ir a mi carnet</Link> (estará en cero hasta que marques partidos).
          </>
        )}
      </p>
    </div>
  );
}
