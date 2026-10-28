"use client";

import { useActionState } from "react";
import { deleteMyAccount } from "../actions.ts";

export function DeleteAccountForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(deleteMyAccount, {});
  return (
    <form key={JSON.stringify(state.values ?? {})} action={action} className="form">
      <p className="small" style={{ margin: 0 }}>
        Se borran para siempre tu cuenta, tus partidos marcados, tus consentimientos y todas tus sesiones. No se puede
        deshacer. Si quieres conservar tu historial, descarga tus datos antes.
      </p>
      <div className="field">
        <label htmlFor="confirmUsername">
          Escribe tu nombre de usuario (<strong>{username}</strong>) para confirmar
        </label>
        <input id="confirmUsername" name="confirmUsername" defaultValue={state.values?.confirmUsername} required autoComplete="off" autoCapitalize="none" spellCheck={false} />
      </div>
      <div className="field">
        <label htmlFor="deletePassword">Tu contraseña</label>
        <input id="deletePassword" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn btn-danger" disabled={pending}>
        {pending ? "Eliminando…" : "Eliminar mi cuenta para siempre"}
      </button>
    </form>
  );
}
