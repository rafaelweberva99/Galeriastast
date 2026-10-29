"use client";

import { startTransition, useActionState, useState } from "react";
import { previewSheetImport } from "../actions.ts";
import { ImportCandidates } from "./ImportCandidates.tsx";

/** Importa una planilla personal: filas copiadas desde Excel/Google Sheets o un archivo CSV. */
export function SheetImport() {
  const [state, analyze, pending] = useActionState(previewSheetImport, {});
  const [text, setText] = useState("");

  const submit = (value: string) => {
    const form = new FormData();
    form.set("text", value);
    startTransition(() => analyze(form));
  };

  return (
    <div className="stack">
      <form
        className="card stack"
        onSubmit={(e) => {
          e.preventDefault();
          submit(text);
        }}
      >
        <label htmlFor="sheet" className="small muted">
          En Excel o Google Sheets selecciona tus filas (con el encabezado), copia y pega aquí. Sirve cualquier orden de
          columnas mientras cada fila tenga la fecha, o el año con el rival y el resultado.
        </label>
        <textarea
          id="sheet"
          rows={8}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Fecha\tLocal\tResultado\tVisita\n10-08-2024\tU. de Chile\t0-0\tColo-Colo\n2017\tUCH\t2-1\tPalestino"}
        />
        <div className="row">
          <button className="btn" disabled={pending}>
            {pending ? "Buscando…" : "Buscar mis partidos"}
          </button>
          <label className="btn btn-ghost" style={{ cursor: "pointer" }}>
            Subir CSV
            <input
              type="file"
              accept=".csv,.tsv,.txt,text/csv,text/plain"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                const content = await file.text();
                setText(content);
                submit(content);
              }}
            />
          </label>
        </div>
      </form>
      {state.error && (
        <p className="error" role="alert">
          {state.error}
        </p>
      )}
      {(state.candidates || state.review) && <ImportCandidates state={state} />}
    </div>
  );
}
