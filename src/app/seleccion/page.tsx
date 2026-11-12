import Link from "next/link";
import { currentUser } from "@/lib/auth.ts";
import { loadCarnet } from "@/lib/carnet.ts";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getTeam, SELECCION_ID } from "@/lib/repo/teams.ts";
import { CarnetView } from "@/components/CarnetView.tsx";
import { Jersey } from "@/components/Jersey.tsx";

export const metadata = { title: "Selección chilena · GaluchaStats" };

/** Sección de La Roja: tu Galería de la Selección chilena, separada de tu Galería de la liga. */
export default async function SeleccionPage() {
  const user = await currentUser();
  const db = await getDb();
  const team = (await getTeam(db, SELECCION_ID))!;
  const id = clubIdentity(team);
  const theme = clubStyle(id) as React.CSSProperties;

  if (!user) {
    return (
      <div className="stack mode-seleccion" style={theme}>
        <section className="card sel-hero">
          <Jersey club={id} size={96} number="12" />
          <div>
            <div className="small">Selección chilena</div>
            <h1 style={{ margin: 0 }}>Tu Galería de La Roja</h1>
            <p style={{ margin: "6px 0 12px" }}>
              Marca los partidos de la Selección a los que fuiste, descubre qué goleador viste más veces y si eres cábala o yeta
              cuando va La Roja. Aparte de tu Galería de la liga.
            </p>
            <div className="row" style={{ gap: 10 }}>
              <Link className="btn" href="/registro">
                Crear mi Galería
              </Link>
              <Link className="btn btn-ghost" href="/ingresar">
                Ingresar
              </Link>
              <Link className="btn btn-ghost" href="/clubes/seleccion-chilena">
                Ver historial de La Roja
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const data = await loadCarnet(db, user, SELECCION_ID);
  return (
    <div className="stack mode-seleccion" style={theme}>
      <section className="card sel-hero">
        <Jersey club={id} size={72} number="12" />
        <div style={{ flex: 1 }}>
          <div className="small">Selección chilena · separada de tu Galería de la liga</div>
          <h1 style={{ margin: 0 }}>Tu Galería de La Roja</h1>
          <div className="row" style={{ gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <Link className="btn" href="/seleccion/partidos">
              {data.carnet.total === 0 ? "Marcar mis partidos de La Roja" : "Marcar más partidos"}
            </Link>
            <Link className="btn btn-ghost" href="/clubes/seleccion-chilena">
              Historial y estadísticas de La Roja
            </Link>
          </div>
          {user.isPublic && (
            <p className="small" style={{ margin: "10px 0 0" }}>
              Tu Galería de La Roja es pública en <Link href={`/hincha/${user.username}/seleccion`}>/hincha/{user.username}/seleccion</Link>.
            </p>
          )}
        </div>
      </section>
      <CarnetView username={user.username} memberId={user.id} {...data} isOwner isPublic={user.isPublic} community={null} national />
    </div>
  );
}
