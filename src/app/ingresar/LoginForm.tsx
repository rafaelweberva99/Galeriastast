"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions.ts";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="login">Usuario o correo</label>
        <input id="login" name="login" required autoComplete="username" />
      </div>
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
      <p className="muted small">
        ¿No tienes carnet? <Link href="/registro">Créalo</Link>
      </p>
      <p className="muted small">
        Al ingresar se usa solo una cookie de sesión. Revisa los <Link href="/terminos">Términos</Link> y la{" "}
        <Link href="/privacidad">Política de Privacidad</Link>.
      </p>
    </form>
  );
}
