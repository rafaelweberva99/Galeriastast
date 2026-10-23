import { requireUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { TicketImport } from "./TicketImport.tsx";

export const metadata = { title: "Importar desde PuntoTicket · GaleríaStats" };

export default async function ImportPage() {
  const user = await requireUser();
  const club = getTeam(getDb(), user.clubId)!;
  return (
    <div className="stack">
      <div>
        <h1>Importar desde PuntoTicket</h1>
        <p className="muted" style={{ maxWidth: 720 }}>
          ¿Compraste tus entradas en PuntoTicket? Pega el correo de confirmación de la compra (o sube el archivo
          .eml) y buscamos los partidos de {club.name} que coinciden. Tú confirmas cuáles marcar. No guardamos el
          contenido del correo.
        </p>
      </div>
      <TicketImport />
      <details className="card">
        <summary style={{ fontWeight: 700, cursor: "pointer" }}>¿Cómo exporto el correo?</summary>
        <ol className="muted">
          <li>Busca en tu correo “PuntoTicket” y abre la confirmación de compra del partido.</li>
          <li>
            <strong>Gmail:</strong> menú ⋮ → “Descargar mensaje” (.eml) y súbelo aquí, o copia y pega el texto.
          </li>
          <li>
            <strong>Outlook / Apple Mail:</strong> arrastra el correo al escritorio para obtener el .eml, o copia el texto.
          </li>
          <li>Puedes pegar varios correos seguidos: detectamos todas las fechas.</li>
        </ol>
      </details>
    </div>
  );
}
