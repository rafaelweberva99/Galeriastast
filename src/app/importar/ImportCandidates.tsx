"use client";

import { confirmTicketImport, type ImportPreview } from "../actions.ts";
import { formatDate } from "@/components/format.ts";

/** Lista de partidos propuestos (por comprobantes o planilla) para confirmar y marcar de una vez. */
export function ImportCandidates({ state, note }: { state: ImportPreview; note?: React.ReactNode }) {
  const candidates = state.candidates ?? [];
  const review = (state.review ?? []).filter((r) => r.options.length > 0);
  const missing = (state.review ?? []).filter((r) => r.options.length === 0);
  return (
    <form action={confirmTicketImport} className="card stack">
      <h2 style={{ margin: 0 }}>
        Encontramos {candidates.length} {candidates.length === 1 ? "partido" : "partidos"}
      </h2>
      {note}
      {candidates.map((c) => (
        <label key={c.id} className="match match-pick" style={{ cursor: "pointer" }}>
          <span className="match-date">{formatDate(c.date)}</span>
          <span className="match-teams">
            <strong>{c.label}</strong>
            <span className="match-meta">
              {c.detail} · coincide por {c.reason}
              {c.alreadyMarked ? " · ya estaba marcado" : ""}
            </span>
          </span>
          <input type="checkbox" name="matchId" value={c.id} defaultChecked={!c.alreadyMarked} />
        </label>
      ))}

      {review.length > 0 && (
        <>
          <h3 style={{ margin: "12px 0 0" }}>Revisa estas filas</h3>
          <p className="muted small" style={{ margin: 0 }}>
            No calzaron con un solo partido. Marca el que corresponde, si está.
          </p>
          {review.map((r) => (
            <div key={r.line} className="stack" style={{ gap: 4 }}>
              <p className="small" style={{ margin: 0 }}>
                <strong>Fila {r.line}:</strong> {r.text} <span className="muted">— {r.problem}</span>
              </p>
              {r.options.map((c) => (
                <label key={c.id} className="match match-pick" style={{ cursor: "pointer" }}>
                  <span className="match-date">{formatDate(c.date)}</span>
                  <span className="match-teams">
                    <strong>{c.label}</strong>
                    <span className="match-meta">
                      {c.detail}
                      {c.alreadyMarked ? " · ya estaba marcado" : ""}
                    </span>
                  </span>
                  <input type="checkbox" name="matchId" value={c.id} />
                </label>
              ))}
            </div>
          ))}
        </>
      )}

      {missing.length > 0 && (
        <details>
          <summary className="small" style={{ cursor: "pointer" }}>
            {missing.length} {missing.length === 1 ? "fila no se encontró" : "filas no se encontraron"} en la base
          </summary>
          <ul className="small muted">
            {missing.map((r) => (
              <li key={r.line}>
                Fila {r.line}: {r.text} — {r.problem}
              </li>
            ))}
          </ul>
        </details>
      )}

      {state.unmatchedDates && state.unmatchedDates.length > 0 && (
        <p className="muted small">
          También leímos {state.unmatchedDates.join(", ")}, pero no hay partidos de tu club esos días en la base.
        </p>
      )}
      <div className="row">
        <select name="mode" defaultValue="propia" aria-label="¿Dónde estuviste?">
          <option value="propia">Fui a la galería de mi club</option>
          <option value="infiltrado">Fui de infiltrado</option>
        </select>
        <button className="btn">Marcar seleccionados</button>
      </div>
    </form>
  );
}
