"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { confirmTicketImport, previewTicketImport } from "../actions.ts";
import { formatDate } from "@/components/format.ts";
import { readTicketFile } from "@/lib/client/ticketReader.ts";

interface Job {
  name: string;
  status: "pendiente" | "leyendo" | "listo" | "error";
  label: string;
  ratio: number | null;
}

export function TicketImport() {
  const [state, analyze, pending] = useActionState(previewTicketImport, {});
  const [text, setText] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showText, setShowText] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const reading = jobs.some((j) => j.status === "leyendo" || j.status === "pendiente");

  const submit = (value: string) => {
    const form = new FormData();
    form.set("text", value);
    startTransition(() => analyze(form));
  };

  const processFiles = async (files: File[]) => {
    if (!files.length) return;
    setJobs(files.map((f) => ({ name: f.name || "captura", status: "pendiente", label: "En espera", ratio: null })));
    const texts: string[] = [];
    for (const [i, file] of files.entries()) {
      const update = (patch: Partial<Job>) => setJobs((js) => js.map((j, k) => (k === i ? { ...j, ...patch } : j)));
      update({ status: "leyendo", label: "Leyendo" });
      try {
        const t = await readTicketFile(file, (label, ratio) => update({ label, ratio }));
        texts.push(t);
        update({ status: "listo", label: "Listo", ratio: 1 });
      } catch (e) {
        update({ status: "error", label: e instanceof Error ? e.message : "No se pudo leer" });
      }
    }
    const all = [text, ...texts].filter((t) => t.trim()).join("\n\n");
    setText(all);
    if (all.trim()) submit(all);
  };

  // Pegar una captura (Ctrl/Cmd+V) o texto en cualquier parte de la página.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])];
      if (files.length) {
        e.preventDefault();
        void processFiles(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  });

  return (
    <div className="stack">
      <label
        htmlFor="ticket-files"
        className={`dropzone ${dragging ? "dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void processFiles([...e.dataTransfer.files]);
        }}
      >
        <span className="dropzone-icon" aria-hidden>
          🎟️
        </span>
        <span className="display" style={{ fontSize: "1.4rem" }}>
          Subir capturas o PDF
        </span>
        <span className="muted small">Toca para elegir de tu galería, arrastra aquí o pega una captura</span>
        <input
          ref={fileRef}
          id="ticket-files"
          type="file"
          accept="image/*,.pdf,application/pdf,.eml,message/rfc822,.txt,.html"
          multiple
          hidden
          onChange={(e) => {
            void processFiles([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </label>

      {jobs.length > 0 && (
        <div className="card stack" aria-live="polite">
          {jobs.map((j, i) => (
            <div key={i} className="job">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="small">{j.name}</span>
                <span className={`small ${j.status === "error" ? "error" : "muted"}`}>{j.label}</span>
              </div>
              <div className="progress">
                <span style={{ width: `${Math.round((j.status === "listo" ? 1 : j.ratio ?? 0.05) * 100)}%` }} />
              </div>
            </div>
          ))}
          {reading && <p className="muted small">La primera vez demora un poco más: el lector se descarga una sola vez.</p>}
        </div>
      )}

      <details className="card" open={showText} onToggle={(e) => setShowText((e.target as HTMLDetailsElement).open)}>
        <summary style={{ fontWeight: 700, cursor: "pointer" }}>¿Tienes el correo de confirmación? Pégalo aquí</summary>
        <form
          className="stack"
          style={{ marginTop: 12 }}
          onSubmit={(e) => {
            e.preventDefault();
            submit(text);
          }}
        >
          <label htmlFor="text" className="small muted">
            Texto del correo, de la entrada o lo que leímos de tus capturas (puedes corregirlo)
          </label>
          <textarea
            id="text"
            name="text"
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ej.: Universidad de Chile vs. Colo-Colo · Domingo 10 de agosto de 2024 · Estadio Nacional"
          />
          <div>
            <button className="btn" disabled={pending || reading}>
              {pending ? "Buscando…" : "Buscar partidos"}
            </button>
          </div>
        </form>
      </details>

      {pending && <p className="muted">Buscando tus partidos…</p>}
      {state.error && <p className="error">{state.error}</p>}

      {state.candidates && (
        <form action={confirmTicketImport} className="card stack">
          <h2 style={{ margin: 0 }}>
            Encontramos {state.candidates.length} {state.candidates.length === 1 ? "partido" : "partidos"}
          </h2>
          {state.providers && state.providers.length > 0 && (
            <p className="muted small" style={{ margin: 0 }}>
              Comprobantes de {state.providers.join(" y ")}
            </p>
          )}
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
          {state.unmatchedDates && state.unmatchedDates.length > 0 && (
            <p className="muted small">
              También leímos {state.unmatchedDates.join(", ")}, pero no hay partidos de tu club esos días en la base (por
              ahora llega hasta mediados de 2024).
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
      )}
    </div>
  );
}
