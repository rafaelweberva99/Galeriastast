"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MIN_AGE } from "@/lib/legal.ts";
import { register } from "../actions.ts";

export function RegisterForm({ clubs, defaultClub }: { clubs: { id: string; name: string }[]; defaultClub: string }) {
  const [state, action, pending] = useActionState(register, {});
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="username">Usuario</label>
        <input id="username" name="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" autoComplete="username" aria-describedby="username-hint" />
        <span id="username-hint" className="muted small">3 a 20 caracteres: letras, números o guion bajo. Será visible si haces público tu carnet.</span>
      </div>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" aria-describedby="password-hint" />
        <span id="password-hint" className="muted small">Mínimo 8 caracteres.</span>
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
      <fieldset className="consents">
        <legend>Tu cuenta y tus datos</legend>
        <label className="check">
          <input type="checkbox" name="acceptTerms" required />
          <span>
            Acepto los{" "}
            <a href="/terminos" target="_blank" rel="noopener noreferrer">
              Términos y Condiciones
            </a>{" "}
            <span className="muted small">(se abre en otra pestaña)</span>
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="acceptPrivacy" required />
          <span>
            He leído la{" "}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer">
              Política de Privacidad
            </a>{" "}
            <span className="muted small">(se abre en otra pestaña)</span>
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="isAdult" required />
          <span>Declaro tener {MIN_AGE} años o más</span>
        </label>
        <label className="check">
          <input type="checkbox" name="isPublic" />
          <span>
            Mostrar mi carnet en los rankings y en mi perfil público <span className="optional">(opcional)</span>
            <br />
            <span className="muted small">Si no la marcas, tu carnet queda privado. Puedes cambiarlo cuando quieras en tu perfil.</span>
          </span>
        </label>
      </fieldset>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Creando…" : "Crear carnet"}
      </button>
      <p className="muted small">
        ¿Ya tienes cuenta? <Link href="/ingresar">Ingresa</Link> · <Link href="/terminos">Términos</Link> ·{" "}
        <Link href="/privacidad">Privacidad</Link>
      </p>
    </form>
  );
}
