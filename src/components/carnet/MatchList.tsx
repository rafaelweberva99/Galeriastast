"use client";
import { useMemo, useState, type ReactNode } from "react";
import { groupBySeason } from "./helpers.ts";

export interface MatchItem {
  id: string;
  season: number;
  competition: string;
  outcome: "G" | "E" | "P" | null;
  /** Texto en minúsculas para el buscador (equipos, torneo, goleadores). */
  search: string;
  node: ReactNode;
}

type ResultFilter = "todos" | "G" | "E" | "P";
const RESULTS: { key: ResultFilter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "G", label: "Ganados" },
  { key: "E", label: "Empates" },
  { key: "P", label: "Perdidos" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Partidos del hincha agrupados por temporada en acordeones (la más reciente abierta), con buscador y filtros. */
export function MatchList({ items }: { items: MatchItem[] }) {
  const [q, setQ] = useState("");
  const [comp, setComp] = useState("");
  const [res, setRes] = useState<ResultFilter>("todos");
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const comps = useMemo(() => [...new Set(items.map((i) => i.competition))].sort(), [items]);
  const filtering = q.trim() !== "" || comp !== "" || res !== "todos";
  const shown = useMemo(() => {
    const needle = norm(q.trim());
    return items.filter((i) => (!comp || i.competition === comp) && (res === "todos" || i.outcome === res) && (!needle || norm(i.search).includes(needle)));
  }, [items, q, comp, res]);
  const groups = useMemo(() => groupBySeason(shown), [shown]);
  const latest = items.length ? Math.max(...items.map((i) => i.season)) : 0;

  const reset = () => {
    setQ("");
    setComp("");
    setRes("todos");
    setOpen({});
  };
  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setOpen({});
  };

  if (!items.length) return <p className="muted cv-empty">Aún no hay partidos marcados.</p>;

  return (
    <div className="cv-matches">
      <div className="cv-filters">
        <label className="cv-search">
          <span className="sr-only">Buscar partido</span>
          <input type="search" value={q} onChange={(e) => change(setQ)(e.target.value)} placeholder="Buscar rival, torneo o goleador" />
        </label>
        <label className="cv-select">
          <span className="sr-only">Competición</span>
          <select value={comp} onChange={(e) => change(setComp)(e.target.value)}>
            <option value="">Todas las competiciones</option>
            {comps.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <div className="cv-seg" role="group" aria-label="Filtrar por resultado">
          {RESULTS.map((r) => (
            <button key={r.key} type="button" aria-pressed={res === r.key} onClick={() => change(setRes)(r.key)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <p className="cv-count muted small" aria-live="polite">
        {filtering ? `${shown.length} de ${items.length} partidos` : `${items.length} partidos en ${groups.length} temporadas`}
        {filtering && (
          <button type="button" className="cv-link" onClick={reset}>
            Quitar filtros
          </button>
        )}
      </p>
      {groups.length === 0 ? (
        <p className="muted cv-empty">Ningún partido coincide con esos filtros.</p>
      ) : (
        groups.map(({ season, items: list }) => {
          const isOpen = open[season] ?? (filtering || season === latest);
          const g = list.filter((i) => i.outcome === "G").length;
          const e = list.filter((i) => i.outcome === "E").length;
          const p = list.filter((i) => i.outcome === "P").length;
          return (
            <section key={season} className="cv-season">
              <h3 className="cv-season-h">
                <button type="button" aria-expanded={isOpen} aria-controls={`temp-${season}`} onClick={() => setOpen((o) => ({ ...o, [season]: !isOpen }))}>
                  <span className="cv-season-year">{season}</span>
                  <span className="cv-season-meta">
                    {list.length} {list.length === 1 ? "partido" : "partidos"}
                  </span>
                  <span className="cv-season-rec" aria-label={`${g} ganados, ${e} empatados, ${p} perdidos`}>
                    <b className="win">{g}</b>
                    <b className="draw">{e}</b>
                    <b className="loss">{p}</b>
                  </span>
                  <span className="cv-chev" aria-hidden>
                    ›
                  </span>
                </button>
              </h3>
              {isOpen && (
                <div id={`temp-${season}`} className="cv-season-body">
                  {list.map((i) => (
                    <div key={i.id}>{i.node}</div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
