"use client";

import { useActionState } from "react";
import { MIN_AGE } from "@/lib/legal.ts";
import { acceptLegalAction } from "../actions.ts";

export function AcceptForm(props: { askTerms: boolean; askPrivacy: boolean; askAge: boolean; askPublic: boolean }) {
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
              </a>
            </span>
          </label>
        )}
        {props.askPrivacy && (
          <label className="check">
            <input type="checkbox" name="acceptPrivacy" required />
            <span>
              Acepto la{" "}
              <a href="/privacidad" target="_blank" rel="noopener noreferrer">
                Política de Privacidad
              </a>
            </span>
          </label>
        )}
        {props.askAge && (
          <label className="check">
            <input type="checkbox" name="isAdult" required />
            <span>Declaro tener {MIN_AGE} años o más</span>
          </label>
        )}
        {props.askPublic && (
          <>
            <input type="hidden" name="askPublic" value="1" />
            <label className="check">
              <input type="checkbox" name="isPublic" />
              <span>
                Mostrar mi carnet en los rankings y en mi perfil público <span className="optional">(opcional)</span>
                <br />
                <span className="muted small">Si no la marcas, tu carnet queda privado.</span>
              </span>
            </label>
          </>
        )}
      </fieldset>
      {state.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Guardando…" : "Aceptar y continuar"}
      </button>
    </form>
  );
}
