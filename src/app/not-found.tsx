import Link from "next/link";

export const metadata = { title: "Fuera de juego · GaluchaStats" };

export default function NotFound() {
  return (
    <div className="card" style={{ maxWidth: 520, margin: "48px auto", textAlign: "center" }}>
      <div className="stat-value" aria-hidden>
        404
      </div>
      <h1 style={{ marginTop: 12 }}>Fuera de juego</h1>
      <p className="muted">Esta página no existe o ya no está disponible.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link className="btn" href="/">
          Volver al inicio
        </Link>
        <Link className="btn btn-ghost" href="/clubes">
          Ver clubes
        </Link>
      </div>
    </div>
  );
}
