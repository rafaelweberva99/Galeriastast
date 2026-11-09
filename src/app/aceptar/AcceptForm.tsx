"use client";

import { useActionState } from "react";
import { MIN_AGE } from "@/lib/legal.ts";
import { acceptLegalAction } from "../actions.ts";

export function AcceptForm(props: { askTerms: boolean; askPrivacy: boolean; askAge: boolean }) {
  const [state, action, pending] = useActionState(acceptLegalAction, {});
  return (
    <form action={action} className="form">
      <fieldset className="consents">
        <legend>Tu aceptación</legend>
        {props.askTerms && (
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
        )}
        {props.askPrivacy && (
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
        )}
        {props.askAge && (
          <label className="check">
            <input type="checkbox" name="isAdult" required />
            <span>Declaro tener {MIN_AGE} años o más</span>
          </label>
        )}
        <p className="notice public-note" role="note">
          <strong>Desde esta versión, tu Galería es pública:</strong> tu usuario, tu club y tus estadísticas aparecen en los
          rankings y en tu página. Tu correo nunca se muestra. Si no quieres que sea pública, no aceptes y elimina tu cuenta.
        </p>
      </fieldset>
      {state.error && <p className="error" role="alert">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Guardando…" : "Aceptar y continuar"}
      </button>
    </form>
  );
}
