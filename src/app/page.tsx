import Link from "next/link";
import { currentUser } from "@/lib/auth.ts";
import { getDb } from "@/lib/db/client.ts";
import { datasetSummary } from "@/lib/repo/matches.ts";
import { clubsByFans } from "@/lib/repo/rankings.ts";

const FEATURES = [
  { title: "Mufómetro", text: "Tu efectividad (puntos ganados / en disputa) en los partidos que viste. Más de 60%: cábala. Menos de 40%: yeta." },
  { title: "Clásicos", text: "Superclásico, Clásico Universitario, Porteño, de Colonias… cómo le va a tu club en los clásicos que viste." },
  { title: "Finales", text: "Las finales a las que fuiste, con penales incluidos. ¿Viste dar la vuelta o llorar?" },
  { title: "Modo Infiltrado", text: "¿Fuiste escondido a la galería rival? También cuenta, y lo separamos aparte." },
  { title: "Impacto real", text: "Comparamos tu efectividad con la del club en esas mismas temporadas: ¿sumas o restas?" },
  { title: "Rankings por club", text: "Los hinchas que más fueron a la cancha, club por club, y las mayores cábalas." },
];

export default async function Home() {
  const db = getDb();
  const [user, summary, clubs] = [await currentUser(), datasetSummary(db), clubsByFans(db).slice(0, 5)];
  return (
    <>
      <section className="hero">
        <h1>¿Eres cábala o yeta?</h1>
        <p className="lead">
          Marca los partidos de tu club a los que fuiste al estadio y descubre tu efectividad como hincha. Con datos
          reales de {summary.matches.toLocaleString("es-CL")} partidos del fútbol chileno
          {summary.firstSeason ? ` desde ${summary.firstSeason}` : ""}.
        </p>
        <div className="row">
          <Link className="btn" href={user ? "/partidos" : "/registro"}>
            {user ? "Marcar partidos" : "Crear mi carnet de hincha"}
          </Link>
          <Link className="btn btn-ghost" href="/rankings">
            Ver rankings
          </Link>
        </div>
      </section>

      <section className="grid grid-4 section">
        <div className="card stat">
          <span className="stat-value">{summary.matches.toLocaleString("es-CL")}</span>
          <span className="stat-label">partidos históricos</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{summary.teams}</span>
          <span className="stat-label">clubes de Primera División</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{summary.competitions}</span>
          <span className="stat-label">competiciones</span>
        </div>
        <div className="card stat">
          <span className="stat-value">
            {summary.firstSeason ?? "—"}–{summary.lastSeason ?? "—"}
          </span>
          <span className="stat-label">temporadas</span>
        </div>
      </section>

      <section className="section">
        <h2>Cómo funciona</h2>
        <div className="grid grid-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card">
              <h3>{f.title}</h3>
              <p className="muted" style={{ margin: 0 }}>
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {clubs.length > 0 && (
        <section className="section card">
          <h2>Clubes con más hinchas en GaleríaStats</h2>
          <ol>
            {clubs.map((c) => (
              <li key={c.clubId}>
                <Link href={`/rankings/${c.clubId}`}>{c.name}</Link>{" "}
                <span className="muted">
                  · {c.fans} hinchas · {c.attendances} partidos marcados
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}
