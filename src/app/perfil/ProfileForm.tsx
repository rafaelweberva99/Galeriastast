"use client";

import { useActionState } from "react";
import { saveProfile } from "../actions.ts";

export function ProfileForm({ clubs, clubId, isPublic }: { clubs: { id: string; name: string }[]; clubId: string; isPublic: boolean }) {
  const [state, action, pending] = useActionState(saveProfile, {});
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="clubId">Club</label>
        <select id="clubId" name="clubId" defaultValue={clubId}>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <label className="row">
        <input type="checkbox" name="isPublic" defaultChecked={isPublic} /> Carnet público y visible en rankings
      </label>
      {state.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>
        Guardar
      </button>
    </form>
  );
}
