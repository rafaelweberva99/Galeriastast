"use client";

import { Children, useRef, useState } from "react";

const STEP = 10;

/** Botones comunes: "Ver 10 más" y "Volver a los primeros 10", con contador. */
function Controls({ shown, total, step, onMore, onReset }: { shown: number; total: number; step: number; onMore: () => void; onReset: () => void }) {
  if (total <= step) return null;
  const left = total - shown;
  return (
    <div className="paged-ctl">
      <span className="muted small paged-count">
        Mostrando {shown} de {total}
      </span>
      {left > 0 && (
        <button type="button" className="btn btn-ghost paged-btn" onClick={onMore}>
          Ver {Math.min(step, left)} más
        </button>
      )}
      {shown > step && (
        <button type="button" className="btn btn-ghost paged-btn" onClick={onReset}>
          ↑ Volver a los primeros {step}
        </button>
      )}
    </div>
  );
}

function usePaged(total: number, step: number) {
  const [n, setN] = useState(step);
  const top = useRef<HTMLDivElement>(null);
  return {
    n: Math.min(n, total),
    top,
    more: () => setN((v) => v + step),
    reset: () => {
      setN(step);
      top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    },
  };
}

/** Lista que muestra de a 10 elementos. Sirve con filas de un servidor (children). */
export function Paged({ children, step = STEP, className }: { children: React.ReactNode; step?: number; className?: string }) {
  const items = Children.toArray(children);
  const p = usePaged(items.length, step);
  return (
    <>
      <div ref={p.top} className={className}>
        {items.slice(0, p.n)}
      </div>
      <Controls shown={p.n} total={items.length} step={step} onMore={p.more} onReset={p.reset} />
    </>
  );
}

/** Igual que Paged, pero para una tabla: `head` es el <thead> y los hijos son las <tr>. */
export function PagedTable({ head, children, step = STEP, className = "" }: { head: React.ReactNode; children: React.ReactNode; step?: number; className?: string }) {
  const rows = Children.toArray(children);
  const p = usePaged(rows.length, step);
  return (
    <>
      <div className="table-wrap" ref={p.top}>
        <table className={className || undefined}>
          {head}
          <tbody>{rows.slice(0, p.n)}</tbody>
        </table>
      </div>
      <Controls shown={p.n} total={rows.length} step={step} onMore={p.more} onReset={p.reset} />
    </>
  );
}
