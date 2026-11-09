"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MIN_AGE } from "@/lib/legal.ts";
import { register } from "../actions.ts";

export function RegisterForm({ clubs, defaultClub }: { clubs: { id: string; name: string }[]; defaultClub: string }) {
  const [state, action, pending] = useActionState(register, {});
  return (
    <form key={JSON.stringify(state.values ?? {})} action={action} className="form">
      <ol className="steps-mini" aria-label="Pasos">
        <li className="now">1 · Tu cuenta</li>
        <li>2 · Carga tus partidos</li>
        <li>3 · Tu Galería</li>
      </ol>
      <div className="field">
        <label htmlFor="username">Usuario</label>
        <input id="username" name="username" defaultValue={state.values?.username} required minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" autoComplete="username" aria-describedby="username-hint" />
        <span id="username-hint" className="muted small">3 a 20 caracteres: letras, números o guion bajo. Será visible si haces público tu Galería.</span>
      </div>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" defaultValue={state.values?.email} type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" aria-describedby="password-hint" />
        <span id="password-hint" className="muted small">Mínimo 8 caracteres.</span>
      </div>
      <div className="field">
        <label htmlFor="clubId">Tu club</label>
        <select id="clubId" name="clubId" required defaultValue={state.values?.clubId || defaultClub}>
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
          <input type="checkbox" name="acceptTerms" defaultChecked={state.values?.acceptTerms === "on"} required />
          <span>
            Acepto los{" "}
            <a href="/terminos" target="_blank" rel="noopener noreferrer">
              Términos y Condiciones
            </a>{" "}
            <span className="muted small">(se abre en otra pestaña)</span>
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="acceptPrivacy" defaultChecked={state.values?.acceptPrivacy === "on"} required />
          <span>
            He leído la{" "}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer">
              Política de Privacidad
            </a>{" "}
            <span className="muted small">(se abre en otra pestaña)</span>
          </span>
        </label>
        <label className="check">
          <input type="checkbox" name="isAdult" defaultChecked={state.values?.isAdult === "on"} required />
          <span>Declaro tener {MIN_AGE} años o más</span>
        </label>
      </fieldset>
      <fieldset className="visibility" aria-describedby="vis-hint">
        <legend>¿Tu Galería será pública?</legend>
        <label className="radio-card">
          <input type="radio" name="visibility" value="public" defaultChecked={state.values?.visibility === "public"} required />
          <span>
            <strong>Pública</strong> <em className="reco">Recomendada</em>
            <br />
            <span className="muted small">Apareces en los rankings de tu club y tus amigos pueden ver y comparar tu Galería contigo.</span>
          </span>
        </label>
        <label className="radio-card">
          <input type="radio" name="visibility" value="private" defaultChecked={state.values?.visibility === "private"} required />
          <span>
            <strong>Privada</strong>
            <br />
            <span className="muted small">Solo tú ves tu Galería y no apareces en los rankings.</span>
          </span>
        </label>
        <span id="vis-hint" className="muted small">Tú decides, y puedes cambiarlo cuando quieras en tu perfil.</span>
      </fieldset>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Creando…" : "Crear mi Galería y cargar partidos"}
      </button>
      <p className="muted small">
        ¿Ya tienes cuenta? <Link href="/ingresar">Ingresa</Link> · <Link href="/terminos">Términos</Link> ·{" "}
        <Link href="/privacidad">Privacidad</Link>
      </p>
    </form>
  );
}
