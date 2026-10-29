import Link from "next/link";
import { logoutEverywhere } from "../actions.ts";
import { requireUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { CONSENT_LABELS } from "@/lib/legal.ts";
import { listConsents } from "@/lib/repo/account.ts";
import { listClubs } from "@/lib/repo/teams.ts";
import { isVisibleClub } from "@/lib/mvp.ts";
import { DeleteAccountForm } from "./DeleteAccountForm.tsx";
import { PrivacyForm } from "./PrivacyForm.tsx";
import { ProfileForm } from "./ProfileForm.tsx";

export const metadata = { title: "Perfil · GaluchaStats" };

export default async function ProfilePage() {
  const user = await requireUser();
  const db = await getDb();
  const clubs = (await listClubs(db)).filter((c) => isVisibleClub(c.id) || c.id === user.clubId).map((c) => ({ id: c.id, name: c.name }));
  const consents = (await listConsents(db, user.id)).slice(-8).reverse();
  return (
    <div className="stack" style={{ maxWidth: 560, margin: "24px auto" }}>
      <div className="card">
        <h1>@{user.username}</h1>
        <p className="muted">Si cambias de club, solo se contarán los partidos marcados que involucren a tu nuevo club.</p>
        <ProfileForm clubs={clubs} clubId={user.clubId} />
      </div>

      <section className="card stack" aria-labelledby="privacidad-datos">
        <h2 id="privacidad-datos" className="section-title" style={{ margin: 0 }}>
          Privacidad y datos
        </h2>
        <p className="muted small" style={{ margin: 0 }}>
          Aquí ejerces tus derechos sobre tus datos personales. Detalle en la{" "}
          <Link href="/privacidad">Política de Privacidad</Link>; también puedes escribirnos al correo indicado allí.
        </p>

        <div className="stack" style={{ gap: 8 }}>
          <h3 style={{ margin: 0 }}>Perfil público</h3>
          <PrivacyForm isPublic={user.isPublic} />
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <h3 style={{ margin: 0 }}>Descargar mis datos</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Un archivo JSON con tu perfil, tus partidos marcados y tu historial de consentimientos (sin tu contraseña).
          </p>
          <div>
            <a className="btn btn-ghost" href="/perfil/datos" download>
              Descargar mis datos
            </a>
          </div>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <h3 style={{ margin: 0 }}>Sesiones</h3>
          <p className="small muted" style={{ margin: 0 }}>
            Cierra tu sesión en todos los dispositivos donde hayas ingresado, incluido este.
          </p>
          <form action={logoutEverywhere}>
            <button className="btn btn-ghost" type="submit">
              Cerrar todas mis sesiones
            </button>
          </form>
        </div>

        {consents.length > 0 && (
          <details>
            <summary>Mis consentimientos registrados</summary>
            <div className="table-wrap">
              <table className="small">
                <thead>
                  <tr>
                    <th>Fecha (UTC)</th>
                    <th>Qué</th>
                    <th>Versión</th>
                    <th>Decisión</th>
                  </tr>
                </thead>
                <tbody>
                  {consents.map((c, i) => (
                    <tr key={i}>
                      <td>{c.createdAt}</td>
                      <td>{CONSENT_LABELS[c.kind]}</td>
                      <td>{c.version}</td>
                      <td>{c.granted ? "Sí" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      <section className="card stack danger-zone" aria-labelledby="eliminar-cuenta">
        <h2 id="eliminar-cuenta" style={{ margin: 0 }}>
          Eliminar mi cuenta
        </h2>
        <DeleteAccountForm username={user.username} />
      </section>
    </div>
  );
}
