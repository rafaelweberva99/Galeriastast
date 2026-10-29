"use client";

import { useActionState } from "react";
import { saveProfile } from "../actions.ts";

export function ProfileForm({
  clubs,
  clubId,
  username,
}: {
  clubs: { id: string; name: string }[];
  clubId: string;
  username: string;
}) {
  const [state, action, pending] = useActionState(saveProfile, {});
  const v = state.values ?? {};
  return (
    <form action={action} className="form" key={JSON.stringify(v)}>
      <div className="field">
        <label htmlFor="username">Nombre de usuario</label>
        <input
          id="username"
          name="username"
          defaultValue={v.username ?? username}
          autoComplete="username"
          pattern="[A-Za-z0-9_]{3,20}"
          aria-describedby="username-hint"
        />
        <span id="username-hint" className="muted small">
          3 a 20 caracteres: letras, números o _. Cambia también el link de tu carnet público y el usuario para ingresar
          (tu correo sigue sirviendo).
        </span>
      </div>
      <div className="field">
        <label htmlFor="clubId">Club</label>
        <select id="clubId" name="clubId" defaultValue={v.clubId ?? clubId}>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>
        Guardar
      </button>
    </form>
  );
}
