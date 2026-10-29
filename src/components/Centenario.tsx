import type { ClubIdentity } from "@/lib/clubTheme.ts";
import { CENTENARIO_GOAL, centenarioTeaser } from "@/lib/domain/centenario.ts";
import { Jersey } from "./Jersey.tsx";

const GOAL = CENTENARIO_GOAL;

export function Centenario({ club, total, owner }: { club: ClubIdentity; total: number; owner: boolean }) {
  const unlocked = total >= GOAL;
  const next = Math.floor(total / GOAL) * GOAL + GOAL;
  const progress = unlocked ? (total % GOAL) / GOAL : total / GOAL;
  return (
    <section className={`card centenario ${unlocked ? "unlocked" : "locked"}`} aria-labelledby="centenario-title">
      <div className="centenario-jersey" aria-hidden>
        <Jersey club={club} size={92} number={String(unlocked ? Math.floor(total / GOAL) * GOAL : GOAL)} />
        {!unlocked && <span className="centenario-lock">🔒</span>}
      </div>
      <div className="stack" style={{ gap: 6, flex: 1, minWidth: 220 }}>
        <h2 id="centenario-title" className="section-title" style={{ margin: 0 }}>
          La camiseta de los {GOAL}
        </h2>
        {unlocked ? (
          <>
            <p style={{ margin: 0 }}>
              <strong>¡Desbloqueada!</strong> Como el jugador que llega a {GOAL} partidos y el club le regala la camiseta
              con el número, {owner ? "te la ganaste" : "se la ganó"}: {total} partidos en la galería. (Es simbólica: no
              esperes que llegue por correo.)
            </p>
            <p className="muted small" style={{ margin: 0 }}>
              Próxima: la de los {next}. {owner ? "Te" : "Le"} faltan {next - total}.
            </p>
          </>
        ) : (
          <>
            <p style={{ margin: 0 }}>
              A los jugadores que cumplen {GOAL} partidos les regalan una camiseta con el número. Aquí también: llega a{" "}
              {GOAL} partidos en la galería y se desbloquea.
            </p>
            <p className="muted small" style={{ margin: 0 }}>
              {centenarioTeaser(total, owner)}
            </p>
          </>
        )}
        <div
          className="progress centenario-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={GOAL}
          aria-valuenow={unlocked ? total % GOAL : total}
          aria-label={`${unlocked ? total % GOAL : total} de ${GOAL} partidos`}
        >
          <span style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="small" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>
            <strong>{unlocked ? total % GOAL : total}</strong> de {GOAL}
          </span>
          <span className="muted">{unlocked ? `rumbo a los ${next}` : `${GOAL - total} por jugar`}</span>
        </div>
      </div>
    </section>
  );
}
