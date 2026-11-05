import { MIN_COMMUNITY_FANS } from "@/lib/domain/community.ts";

/** Estado vacío amable: cuántos hinchas hay y cuántos faltan para mostrar las cifras de la hinchada. */
export function Waiting({ fans, fansWord, compact }: { fans: number; fansWord: string; compact?: boolean }) {
  const missing = Math.max(0, MIN_COMMUNITY_FANS - fans);
  return (
    <div className={`cm-waiting${compact ? " compact" : ""}`}>
      <div className="cm-dots" role="img" aria-label={`${Math.min(fans, MIN_COMMUNITY_FANS)} de ${MIN_COMMUNITY_FANS} hinchas`}>
        {Array.from({ length: MIN_COMMUNITY_FANS }, (_, i) => (
          <span key={i} className={i < fans ? "on" : ""} />
        ))}
      </div>
      <p>
        {fans === 0
          ? `Aún no hay ${fansWord} con perfil público.`
          : `Hay ${fans} ${fans === 1 ? "hincha" : "hinchas"} con perfil público.`}{" "}
        {compact
          ? `Faltan ${missing} para ver las cifras.`
          : `Cuando seamos ${MIN_COMMUNITY_FANS} aparecerán aquí las comparaciones: partidos más marcados, cuántos son cábala y cuántos yeta. Faltan ${missing}.`}
      </p>
    </div>
  );
}
