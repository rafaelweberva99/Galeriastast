import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "../actions.ts";
import { requireUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { legalVersionLabel, REQUIRED_DOCS } from "@/lib/legal.ts";
import { legalStatus, needsAcceptance } from "@/lib/repo/account.ts";
import { DeleteAccountForm } from "../perfil/DeleteAccountForm.tsx";
import { AcceptForm } from "./AcceptForm.tsx";

export const metadata = { title: "Actualizamos nuestras condiciones · GaleríaStats" };

export default async function AcceptPage() {
  const user = await requireUser({ allowPendingLegal: true });
  const status = await legalStatus(await getDb(), user.id);
  if (!needsAcceptance(status)) redirect("/carnet");
  return (
    <div className="stack" style={{ maxWidth: 560, margin: "24px auto" }}>
      <div className="card stack">
        <h1 style={{ margin: 0 }}>Antes de seguir, @{user.username}</h1>
        <p className="muted" style={{ margin: 0 }}>
          Actualizamos nuestras condiciones o aún no tenemos registrada tu aceptación. Para seguir usando tu carnet
          necesitamos que leas y aceptes la versión vigente:
        </p>
        <ul style={{ margin: 0 }}>
          {status.pending.includes("terms") && (
            <li>
              <Link href="/terminos" target="_blank">
                Términos y Condiciones
              </Link>{" "}
              (versión {legalVersionLabel(REQUIRED_DOCS.terms)})
            </li>
          )}
          {status.pending.includes("privacy") && (
            <li>
              <Link href="/privacidad" target="_blank">
                Política de Privacidad
              </Link>{" "}
              (versión {legalVersionLabel(REQUIRED_DOCS.privacy)})
            </li>
          )}
          {!status.ageDeclared && <li>La declaración de edad mínima.</li>}
        </ul>
        <AcceptForm
          askTerms={status.pending.includes("terms")}
          askPrivacy={status.pending.includes("privacy")}
          askAge={!status.ageDeclared}
          askPublic={!status.publicChoiceMade}
        />
      </div>

      <div className="card stack">
        <h2 style={{ margin: 0 }}>¿No estás de acuerdo?</h2>
        <p className="muted" style={{ margin: 0 }}>
          No tienes que aceptar. Puedes descargar tus datos, salir o eliminar tu cuenta y todos sus datos.
        </p>
        <div className="row">
          <a className="btn btn-ghost" href="/perfil/datos" download>
            Descargar mis datos
          </a>
          <form action={logout}>
            <button className="btn btn-ghost" type="submit">
              Salir
            </button>
          </form>
        </div>
        <details>
          <summary>Eliminar mi cuenta</summary>
          <div style={{ marginTop: 12 }}>
            <DeleteAccountForm username={user.username} />
          </div>
        </details>
      </div>
    </div>
  );
}
