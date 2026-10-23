"use client";

import Link from "next/link";
import { useActionState } from "react";
import { register } from "../actions.ts";

export function RegisterForm({ clubs, defaultClub }: { clubs: { id: string; name: string }[]; defaultClub: string }) {
  const [state, action, pending] = useActionState(register, {});
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="username">Usuario</label>
        <input id="username" name="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      <div className="field">
        <label htmlFor="clubId">Tu club</label>
        <select id="clubId" name="clubId" required defaultValue={defaultClub}>
          <option value="" disabled>
            Elige tu club…
          </option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {state.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Creando…" : "Crear carnet"}
      </button>
      <p className="muted small">
        ¿Ya tienes cuenta? <Link href="/ingresar">Ingresa</Link>
      </p>
    </form>
  );
}
