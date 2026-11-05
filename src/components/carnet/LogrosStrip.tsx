import type { Achievements } from "@/lib/domain/achievements.ts";
import { RUEDA_COMPLETA } from "@/lib/domain/achievements.ts";
import { CENTENARIO_GOAL } from "@/lib/domain/centenario.ts";

function Badge({ icon, title, value, sub, done, progress }: { icon: string; title: string; value: string; sub: string; done: boolean; progress?: number }) {
  return (
    <li className={`cv-badge ${done ? "got" : ""}`}>
      <span className="cv-badge-icon" aria-hidden>
        {icon}
      </span>
      <div>
        <div className="cv-badge-title">{title}</div>
        <div className="cv-badge-value">{value}</div>
        <div className="cv-badge-sub">{sub}</div>
        {progress !== undefined && (
          <div className="cv-badge-bar" aria-hidden>
            <span style={{ width: `${Math.round(Math.min(1, progress) * 100)}%` }} />
          </div>
        )}
      </div>
    </li>
  );
}

/** Franja compacta de logros: nivel del carnet, camiseta de los 100, rueda completa y temporada perfecta. */
export function LogrosStrip({ a }: { a: Achievements }) {
  const tierName = a.tier.key === "socio" ? "Socio" : a.tier.label.replace("Carnet ", "");
  const centRem = a.total % CENTENARIO_GOAL;
  const unlocked = a.total >= CENTENARIO_GOAL;
  const perfect = a.perfectLeague.length + a.perfectTotal.length;
  return (
    <ul className="cv-badges">
      <Badge
        icon="🪪"
        title="Nivel del carnet"
        value={tierName}
        sub={a.next ? `faltan ${a.next.min - a.total} para ${a.next.label.replace("Carnet ", "")}` : "el nivel más alto"}
        done={a.tier.key !== "socio"}
        progress={a.next ? (a.total - a.tier.min) / (a.next.min - a.tier.min) : 1}
      />
      <Badge
        icon="👕"
        title={`Camiseta de los ${CENTENARIO_GOAL}`}
        value={unlocked ? "Desbloqueada" : `${a.total} / ${CENTENARIO_GOAL}`}
        sub={unlocked ? `rumbo a los ${Math.floor(a.total / CENTENARIO_GOAL) * CENTENARIO_GOAL + CENTENARIO_GOAL}` : `faltan ${CENTENARIO_GOAL - a.total}`}
        done={unlocked}
        progress={unlocked ? centRem / CENTENARIO_GOAL : a.total / CENTENARIO_GOAL}
      />
      <Badge
        icon="🔄"
        title="Una rueda completa"
        value={a.rueda.done ? "Lograda" : `${RUEDA_COMPLETA - a.rueda.missing} / ${RUEDA_COMPLETA}`}
        sub={a.rueda.done ? `${RUEDA_COMPLETA} partidos` : `faltan ${a.rueda.missing}`}
        done={a.rueda.done}
        progress={(RUEDA_COMPLETA - a.rueda.missing) / RUEDA_COMPLETA}
      />
      <Badge
        icon="🏟️"
        title="Temporada perfecta"
        value={perfect ? `${perfect}` : "Aún no"}
        sub={perfect ? "temporadas perfectas" : a.closest ? `más cerca: ${a.closest.attended} de ${a.closest.matches} en ${a.closest.season}` : "ir a todos los partidos de liga"}
        done={perfect > 0}
        progress={!perfect && a.closest ? a.closest.attended / a.closest.matches : undefined}
      />
    </ul>
  );
}
