import { clubTicketing } from "@/lib/ticketing.ts";

/** Enlace a la venta oficial de entradas de local del club (se abre en la ticketera). */
export function BuyTickets({ clubId, compact = false }: { clubId: string; compact?: boolean }) {
  const t = clubTicketing(clubId);
  if (!t?.buyUrl) return null;
  return (
    <a className={compact ? "buy-link" : "btn btn-light buy-btn"} href={t.buyUrl} target="_blank" rel="noopener noreferrer">
      🎟️ Comprar entradas{t.provider ? ` en ${t.provider.name}` : ""}
      <span aria-hidden> ↗</span>
    </a>
  );
}
