"use client";

import { useOptimistic, useTransition, useState } from "react";
import { toggleAttendance } from "@/app/actions.ts";
import type { AttendanceMode } from "@/lib/domain/types.ts";

type State = AttendanceMode | "ninguno";

const OPTIONS: { value: State; label: string; title: string; className?: string }[] = [
  { value: "ninguno", label: "No fui", title: "No fui a este partido" },
  { value: "propia", label: "Fui", title: "Fui a la galería de mi club" },
  { value: "infiltrado", label: "Infiltrado", title: "Fui escondido a la galería rival", className: "inf" },
];

export function AttendanceToggle({ matchId, initial }: { matchId: string; initial: State }) {
  const [saved, setSaved] = useState<State>(initial);
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const choose = (value: State) =>
    start(async () => {
      setOptimistic(value);
      const form = new FormData();
      form.set("matchId", matchId);
      form.set("mode", value);
      const res = await toggleAttendance(form);
      if (res.error) setError(res.error);
      else {
        setError(null);
        setSaved(value);
      }
    });

  return (
    <div>
      <div className="toggle" role="group" aria-label="¿Fuiste a este partido?" aria-busy={pending}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            title={o.title}
            className={o.className}
            aria-pressed={optimistic === o.value}
            onClick={() => choose(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {error && <div className="error small">{error}</div>}
    </div>
  );
}
