import { Ball } from "./Ball.tsx";

/** Panel de beneficios junto a los formularios de ingreso y registro (solo escritorio). */
export function AuthPerks() {
  return (
    <aside className="pitch auth-perks" aria-label="Qué incluye tu carnet">
      <Ball size={40} />
      <h2>Tu carnet de hincha</h2>
      <ul>
        <li><b>Mufómetro</b><span>¿Cábala o yeta cuando tú vas?</span></li>
        <li><b>Ídolos y verdugos</b><span>El goleador que más viste y el que más te hizo sufrir.</span></li>
        <li><b>Resumen del año</b><span>Una imagen lista para compartir y comparar con tus amigos.</span></li>
      </ul>
      <p className="small">Gratis · solo para entretención</p>
    </aside>
  );
}
