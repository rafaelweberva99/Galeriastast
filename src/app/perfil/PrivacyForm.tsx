"use client";

import { useActionState } from "react";
import { savePrivacy } from "../actions.ts";

export function PrivacyForm({ isPublic }: { isPublic: boolean }) {
  const [state, action, pending] = useActionState(savePrivacy, {});
  return (
    <form action={action} className="form">
      <label className="check">
        <input type="checkbox" name="isPublic" defaultChecked={isPublic} />
        <span>
          Mostrar mi carnet en los rankings y en mi perfil público
          <br />
          <span className="muted small">Desmarcada, tu carnet es privado: solo tú lo ves.</span>
        </span>
      </label>
      {state.error && <p className="error">{state.error}</p>}
      {state.ok && <p className="ok">{state.ok}</p>}
      <button className="btn btn-ghost" disabled={pending}>
        {pending ? "Guardando…" : "Guardar preferencia"}
      </button>
    </form>
  );
}
