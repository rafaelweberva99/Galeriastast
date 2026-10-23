"use client";

import { useActionState, useRef, useState } from "react";
import { confirmTicketImport, previewTicketImport } from "../actions.ts";
import { formatDate } from "@/components/format.ts";

export function TicketImport() {
  const [state, analyze, pending] = useActionState(previewTicketImport, {});
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const loadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const parts = await Promise.all([...files].map((f) => f.text()));
    setText(parts.join("\n\n"));
  };

  return (
    <div className="stack">
      <form action={analyze} className="card stack">
        <div className="field">
          <label htmlFor="text">Correo de confirmación de PuntoTicket</label>
          <textarea
            id="text"
            name="text"
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Ej.: Universidad de Chile vs. Colo-Colo · Domingo 10 de agosto de 2024 · Estadio Nacional…"}
            style={{ font: "inherit", padding: 12, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" }}
          />
        </div>
        <div className="row">
          <input ref={fileRef} type="file" accept=".eml,.txt,.html,message/rfc822" multiple onChange={(e) => loadFiles(e.target.files)} />
          <button className="btn" disabled={pending}>
            {pending ? "Buscando…" : "Buscar partidos"}
          </button>
        </div>
        {state.error && <p className="error">{state.error}</p>}
      </form>

      {state.candidates && (
        <form action={confirmTicketImport} className="card stack">
          <h2 style={{ margin: 0 }}>Encontramos {state.candidates.length} {state.candidates.length === 1 ? "partido" : "partidos"}</h2>
          {state.candidates.map((c) => (
            <label key={c.id} className="match" style={{ cursor: "pointer" }}>
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
          <div className="row">
            <select name="mode" defaultValue="propia" aria-label="¿Dónde estuviste?">
              <option value="propia">Fui a la galería de mi club</option>
              <option value="infiltrado">Fui de infiltrado</option>
            </select>
            <button className="btn">Marcar seleccionados</button>
          </div>
        </form>
      )}
    </div>
  );
}
