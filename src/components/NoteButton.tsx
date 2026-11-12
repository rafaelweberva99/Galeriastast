"use client";

import { useState, useTransition } from "react";
import { saveNoteAction } from "@/app/actions.ts";

/** Nota personal sobre un partido: solo la ve el propio hincha. */
export function NoteButton({ matchId, initial }: { matchId: string; initial: string }) {
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const save = () =>
    start(async () => {
      const form = new FormData();
      form.set("matchId", matchId);
      form.set("text", text);
      const res = await saveNoteAction(form);
      if (res.error) setError(res.error);
      else {
        setError(null);
        setSaved(text.trim());
        setText(text.trim());
        setOpen(false);
      }
    });

  return (
    <div className="note-box">
      <button type="button" className="btn btn-ghost note-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        📝 {saved ? "Mi nota" : "Agregar nota"}
      </button>
      {!open && saved && <p className="note-preview muted small">{saved.length > 90 ? `${saved.slice(0, 89)}…` : saved}</p>}
      {open && (
        <div className="stack" style={{ gap: 8 }}>
          <label className="small muted" htmlFor={`nota-${matchId}`}>
            Solo tú puedes leer esta nota.
          </label>
          <textarea id={`nota-${matchId}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={600} rows={3} placeholder="¿Con quién fuiste? ¿Cómo estuvo el ambiente?" />
          {error && <p className="error" role="alert">{error}</p>}
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" onClick={save} disabled={pending}>
              Guardar
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => { setText(saved); setOpen(false); }}>
              Cancelar
            </button>
            <span className="muted small">{text.length}/600</span>
          </div>
        </div>
      )}
    </div>
  );
}
