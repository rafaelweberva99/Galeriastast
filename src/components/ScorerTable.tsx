"use client";

import { useRef, useState } from "react";
import type { ScorerTally } from "@/lib/domain/scorers.ts";
import { formatDate } from "./format.ts";

const TOP = 10;

/**
 * Tabla de goleadores (o verdugos): de 10 en 10, con opción de volver a los primeros. Al tocar un jugador se abren, debajo de su
 * fila, los partidos donde suma sus goles, para que el hincha pueda revisar de dónde sale cada número.
 */
export function ScorerTable({ rows, teamNames, showTeam }: { rows: ScorerTally[]; teamNames: Record<string, string>; showTeam: boolean }) {
  const [n, setN] = useState(TOP);
  const top = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  if (!rows.length) return <p className="muted">Sin goles registrados todavía.</p>;
  const shown = rows.slice(0, n);
  return (
    <>
      <div className="table-wrap" ref={top}>
        <table className="scorer-table">
          <thead>
            <tr>
              <th className="rank">#</th>
              <th>Jugador</th>
              <th className="num">Goles</th>
              <th className="num">PJ</th>
              <th className="num">Pen.</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((s, i) => {
              const key = `${s.player}|${s.teamId}`;
              const isOpen = open === key;
              return (
                <ScorerRow key={key} s={s} rank={i + 1} isOpen={isOpen} onToggle={() => setOpen(isOpen ? null : key)} team={showTeam ? teamNames[s.teamId] ?? s.teamId : null} />
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > TOP && (
        <div className="paged-ctl">
          <span className="muted small paged-count">
            Mostrando {shown.length} de {rows.length}
          </span>
          {shown.length < rows.length && (
            <button type="button" className="btn btn-ghost paged-btn" onClick={() => setN((v) => v + TOP)}>
              Ver {Math.min(TOP, rows.length - shown.length)} más
            </button>
          )}
          {shown.length > TOP && (
            <button
              type="button"
              className="btn btn-ghost paged-btn"
              onClick={() => {
                setN(TOP);
                setOpen(null);
                top.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
              }}
            >
              ↑ Volver a los primeros {TOP}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function ScorerRow({ s, rank, isOpen, onToggle, team }: { s: ScorerTally; rank: number; isOpen: boolean; onToggle: () => void; team: string | null }) {
  return (
    <>
      <tr className={isOpen ? "scorer-row open" : "scorer-row"}>
        <td className="rank muted">{rank}</td>
        <td>
          <button type="button" className="scorer-name" onClick={onToggle} aria-expanded={isOpen} title="Ver los partidos">
            <span className="chev" aria-hidden>
              ▸
            </span>
            <span>
              <strong>{s.player}</strong>
              {team && <span className="muted small scorer-team">{team}</span>}
            </span>
          </button>
        </td>
        <td className="num">
          <strong>{s.goals}</strong>
        </td>
        <td className="num">{s.matches}</td>
        <td className="num">{s.penalties || "—"}</td>
      </tr>
      {isOpen && (
        <tr className="scorer-games">
          <td />
          <td colSpan={4}>
            <ul>
              {s.games.map((g) => (
                <li key={g.matchId}>
                  <span className="muted g-date">{formatDate(g.date)}</span>
                  <span className="g-label">{g.label}</span>
                  <span className="pill g-goals">
                    {g.goals} {g.goals === 1 ? "gol" : "goles"}
                  </span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}
