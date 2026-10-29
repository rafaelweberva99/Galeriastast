import { requireUser } from "@/lib/auth.ts";
import { clubIdentity } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { getTeam } from "@/lib/repo/teams.ts";
import { Jersey } from "@/components/Jersey.tsx";
import { clubTicketing, providersInUse } from "@/lib/ticketing.ts";
import { BuyTickets } from "@/components/BuyTickets.tsx";
import { TicketImport } from "./TicketImport.tsx";
import { SheetImport } from "./SheetImport.tsx";

export const metadata = { title: "Importar desde PuntoTicket · GaluchaStats" };

export default async function ImportPage() {
  const user = await requireUser();
  const club = (await getTeam(await getDb(), user.clubId))!;
  const own = clubTicketing(club.id);
  const seller = own?.provider ?? { id: "puntoticket", name: "PuntoTicket", history: "tu cuenta → historial de compras" };
  const others = providersInUse().filter((p) => p.provider.id !== seller.id);
  return (
    <div className="stack">
      <div className="club-banner row">
        <Jersey club={clubIdentity(club)} size={72} number="12" />
        <div>
          <div className="small">Importar entradas · {club.name}</div>
          <h1>Tus entradas</h1>
          <p className="muted" style={{ margin: 0 }}>
            {club.name} vende sus entradas en <strong>{seller.name}</strong>
            {own?.ownPortal ? " (su portal propio)" : ""}. Sube una captura de tus compras y marcamos los partidos solos.
          </p>
        </div>
      </div>
      <ol className="steps">
        <li>
          <strong>Abre {seller.name}</strong> en la app o en la web y entra a tu historial de compras ({seller.history}).
          Si fuiste de visita, busca en la ticketera del club local.
        </li>
        <li>
          <strong>Toma una captura de pantalla.</strong> Si tienes muchas compras, toma varias.
        </li>
        <li>
          <strong>Súbelas aquí.</strong> También sirve el PDF de la entrada o el correo de confirmación.
        </li>
      </ol>
      <TicketImport />
      <details className="card">
        <summary style={{ fontWeight: 700, cursor: "pointer" }}>¿Compraste en otra ticketera?</summary>
        <p className="muted small" style={{ marginTop: 10 }}>
          Cada club vende sus partidos de local en su ticketera. Leemos comprobantes de todas:
        </p>
        <ul className="small">
          <li>
            <strong>{seller.name}</strong> — {seller.history}
          </li>
          {others.map(({ provider, clubs }) => (
            <li key={provider.id}>
              <strong>{provider.name}</strong> — {provider.history}{" "}
              <span className="muted">
                ({clubs.length} {clubs.length === 1 ? "club" : "clubes"})
              </span>
            </li>
          ))}
        </ul>
        <BuyTickets clubId={club.id} compact />
      </details>
      <section className="stack" id="planilla">
        <h2 className="section-title">¿Llevas tus partidos en un Excel?</h2>
        <SheetImport />
      </section>
      <p className="muted small">
        Las imágenes y PDF se leen en tu teléfono: no se suben a ningún servidor. Solo enviamos el texto leído para
        buscar los partidos, y no lo guardamos.
      </p>
    </div>
  );
}
