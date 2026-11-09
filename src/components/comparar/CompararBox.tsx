"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { validarAmigo } from "@/app/comparar/actions.ts";

/** "Comparar con un amigo": escribe su @usuario y te lleva al cara a cara. `from` = tu @usuario (por defecto, tú). */
export function CompararBox({ from = "yo" }: { from?: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="card cmp-box" aria-labelledby="cmp-box-title">
      <h2 id="cmp-box-title" className="section-title" style={{ margin: 0 }}>
        Comparar con un amigo
      </h2>
      <p className="muted small" style={{ margin: "6px 0 10px" }}>
        Mi Mufómetro vs el tuyo. Funciona con hinchas de cualquier club con Galería pública.
      </p>
      <form
        className="cmp-box-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          start(async () => {
            const r = await validarAmigo(from, value);
            if (r.ok) router.push(r.href);
            else setError(r.message);
          });
        }}
      >
        <label className="sr-only" htmlFor="cmp-friend">
          Usuario de tu amigo
        </label>
        <input
          id="cmp-friend"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="@usuario de tu amigo"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={41}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "cmp-friend-err" : undefined}
        />
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Buscando…" : "Comparar"}
        </button>
      </form>
      {error && (
        <p id="cmp-friend-err" className="notice error" role="alert" style={{ margin: "10px 0 0" }}>
          {error}
        </p>
      )}
    </section>
  );
}
