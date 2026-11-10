"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";

/**
 * Formulario de filtros (GET) que se aplica solo al cambiar cualquier campo, sin botón "Filtrar".
 * Mientras carga muestra "Actualizando…" y atenúa los resultados (clase .filters-busy en el formulario).
 */
export function AutoFilterForm({ children, className }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  function apply(form: HTMLFormElement) {
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v !== "") params.set(k, v);
    const qs = params.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  return (
    <form
      className={className}
      method="get"
      aria-busy={pending}
      data-busy={pending ? "1" : undefined}
      onChange={(e) => apply(e.currentTarget)}
      onSubmit={(e) => {
        e.preventDefault();
        apply(e.currentTarget);
      }}
    >
      {children}
      <span className="filters-status small muted" role="status" aria-live="polite">
        {pending ? "Actualizando…" : ""}
      </span>
      {/* Sin JavaScript no hay cambio automático: queda el botón. */}
      <noscript>
        <button className="btn">Filtrar</button>
      </noscript>
    </form>
  );
}
