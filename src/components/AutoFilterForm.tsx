"use client";

import type { ReactNode } from "react";

/** Formulario GET de filtros que se aplica solo al cambiar cualquier campo (sin botón "Filtrar"). */
export function AutoFilterForm({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <form className={className} method="get" onChange={(e) => e.currentTarget.requestSubmit()}>
      {children}
      {/* Sin JavaScript no hay cambio automático: queda el botón. */}
      <noscript>
        <button className="btn">Filtrar</button>
      </noscript>
    </form>
  );
}
