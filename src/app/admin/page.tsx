import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth.ts";
import { isAdmin } from "@/lib/admin.ts";
import { getDb } from "@/lib/db/client.ts";
import { REQUIRED_DOCS } from "@/lib/legal.ts";
import { MVP_CLUBS } from "@/lib/mvp.ts";
import { adminSummary } from "@/lib/repo/admin.ts";
import { datasetSummary } from "@/lib/repo/matches.ts";
import { listClubs } from "@/lib/repo/teams.ts";

export const metadata = { title: "Administración · GaluchaStats" };

export default async function AdminPage() {
  const user = await requireUser();
  if (!isAdmin(user)) notFound();
  const db = await getDb();
  const [s, data, clubs] = await Promise.all([adminSummary(db, REQUIRED_DOCS), datasetSummary(db), listClubs(db)]);
  const hidden = clubs.filter((c) => c.current && !MVP_CLUBS.includes(c.id));
  const stat = (value: number | string, label: string) => (
    <div className="card stat">
      <span className="stat-value">{typeof value === "number" ? value.toLocaleString("es-CL") : value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
  return (
    <div className="stack">
      <h1 className="section-title">Administración</h1>
      <p className="muted" style={{ margin: 0 }}>
        Cifras agregadas: este panel no muestra datos personales de los hinchas.
      </p>
      <section className="grid grid-4">
        {stat(s.users, "hinchas registrados")}
        {stat(s.usersLast7Days, "nuevos en 7 días")}
        {stat(s.attendances, "partidos marcados")}
        {stat(s.publicUsers, "carnets públicos")}
      </section>
      <section className="grid grid-4">
        {stat(s.infiltrated, "marcados de infiltrado")}
        {stat(s.pendingLegal, "con condiciones por aceptar")}
        {stat(data.matches, "partidos en la base")}
        {stat(`${data.firstSeason ?? "—"}–${data.lastSeason ?? "—"}`, "temporadas")}
      </section>

      <section className="card">
        <h2 className="section-title">Hinchas por club</h2>
        {s.byClub.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Club</th>
                  <th className="num">Hinchas</th>
                  <th className="num">Partidos marcados</th>
                </tr>
              </thead>
              <tbody>
                {s.byClub.map((c) => (
                  <tr key={c.clubId}>
                    <td>
                      <Link href={`/clubes/${c.clubId}`}>{c.name}</Link>
                    </td>
                    <td className="num">{c.users}</td>
                    <td className="num">{c.attendances}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Todavía no hay hinchas registrados.</p>
        )}
      </section>

      <section className="card">
        <h2 className="section-title">Clubes ocultos del MVP</h2>
        <p className="muted small">
          No se ofrecen para crear carnet hasta completar su historial (data/catalog/mvp.json). Como administrador puedes
          ver sus páginas:
        </p>
        <p>
          {hidden.map((c, i) => (
            <span key={c.id}>
              {i > 0 && " · "}
              <Link href={`/clubes/${c.id}`}>{c.name}</Link>
            </span>
          ))}
        </p>
      </section>
    </div>
  );
}
