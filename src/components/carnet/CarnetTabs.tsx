"use client";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabDef {
  id: string;
  label: string;
  /** Cifra opcional junto al nombre (p. ej. cantidad de partidos). */
  badge?: string | number;
  content: ReactNode;
}

/**
 * Pestañas del carnet. Todos los paneles vienen renderizados desde el servidor y solo se oculta el inactivo, así el
 * cambio es instantáneo. La pestaña activa se refleja en el #hash (se puede compartir/volver con "atrás").
 */
export function CarnetTabs({ tabs }: { tabs: TabDef[] }) {
  const [active, setActive] = useState(tabs[0].id);
  const bar = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);

  const fromHash = useCallback(() => {
    const h = decodeURIComponent(window.location.hash.slice(1));
    if (tabs.some((t) => t.id === h)) setActive(h);
  }, [tabs]);

  useEffect(() => {
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [fromHash]);

  // La pestaña activa siempre queda a la vista dentro de la barra deslizable.
  useEffect(() => {
    const el = bar.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView?.({ inline: "center", block: "nearest" });
  }, [active]);

  const select = (id: string) => {
    setActive(id);
    try {
      window.history.replaceState(null, "", `#${id}`);
    } catch {
      /* sin historial: no pasa nada */
    }
    // Si la barra ya está "pegada" arriba, vuelve al inicio del contenido nuevo.
    const t = top.current;
    if (t && t.getBoundingClientRect().top < 0) t.scrollIntoView({ block: "start" });
  };

  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === active);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    select(t.id);
    document.getElementById(`tab-${t.id}`)?.focus();
  };

  return (
    <div className="cv-tabs" ref={top}>
      <div className="cv-tabbar">
        <div className="cv-tablist" role="tablist" aria-label="Secciones del carnet" ref={bar} onKeyDown={onKey}>
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={active === t.id}
              aria-controls={`panel-${t.id}`}
              tabIndex={active === t.id ? 0 : -1}
              onClick={() => select(t.id)}
            >
              {t.label}
              {t.badge !== undefined && <span className="cv-tab-badge">{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>
      {tabs.map((t) => (
        <div key={t.id} id={`panel-${t.id}`} role="tabpanel" aria-labelledby={`tab-${t.id}`} hidden={active !== t.id} className="cv-panel stack">
          {t.content}
        </div>
      ))}
    </div>
  );
}
