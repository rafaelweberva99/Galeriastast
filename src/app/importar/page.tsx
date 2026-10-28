import { requireUser } from "@/lib/auth.ts";
import { clubIdentity } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { Jersey } from "@/components/Jersey.tsx";
import { TicketImport } from "./TicketImport.tsx";

export const metadata = { title: "Importar desde PuntoTicket · GaleríaStats" };

export default async function ImportPage() {
  const user = await requireUser();
  const club = (await getTeam(await getDb(), user.clubId))!;
  return (
    <div className="stack">
      <div className="club-banner row">
        <Jersey club={clubIdentity(club)} size={72} number="12" />
        <div>
          <div className="small">Importar entradas · {club.name}</div>
          <h1>Tus entradas de PuntoTicket</h1>
          <p className="muted" style={{ margin: 0 }}>
            Sube una captura de tus compras y marcamos los partidos solos.
          </p>
        </div>
      </div>
      <ol className="steps">
        <li>
          <strong>Abre PuntoTicket</strong> en la app o en la web y entra a tu historial de compras (Mi cuenta → Mis
          compras).
        </li>
        <li>
          <strong>Toma una captura de pantalla.</strong> Si tienes muchas compras, toma varias.
        </li>
        <li>
          <strong>Súbelas aquí.</strong> También sirve el PDF de la entrada o el correo de confirmación.
        </li>
      </ol>
      <TicketImport />
      <p className="muted small">
        Las imágenes y PDF se leen en tu teléfono: no se suben a ningún servidor. Solo enviamos el texto leído para
        buscar los partidos, y no lo guardamos.
      </p>
    </div>
  );
}
