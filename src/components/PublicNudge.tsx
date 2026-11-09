"use client";

import { useActionState } from "react";
import { savePrivacy } from "@/app/actions.ts";

/** Invitación (no cambia nada sola) para quien tiene su Galería privada: un clic para hacerla pública. */
export function PublicNudge() {
  const [state, action, pending] = useActionState(savePrivacy, {});
  if (state.ok) return <p className="ok card" role="status">{state.ok}</p>;
  return (
    <form action={action} className="card nudge">
      <input type="hidden" name="isPublic" value="on" />
      <div>
        <strong>Tu Galería es privada.</strong>{" "}
        <span className="muted">Si la haces pública apareces en los rankings de tu club y tus amigos pueden compararse contigo. Puedes volver a privada cuando quieras.</span>
        {state.error && <p className="error" role="alert">{state.error}</p>}
      </div>
      <button className="btn" disabled={pending}>
        {pending ? "Guardando…" : "Hacerla pública"}
      </button>
    </form>
  );
}
