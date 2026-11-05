import Link from "next/link";
import { getDb } from "@/lib/db/client.ts";
import { rankDesc } from "@/lib/domain/community.ts";
import { communityOverview, type ClubCommunity } from "@/lib/repo/community.ts";
import { listClubs } from "@/lib/repo/teams.ts";
import { visibleClubs } from "@/lib/mvp.ts";
import { pct } from "@/components/format.ts";
import { HBars } from "@/components/community/Bars.tsx";
import { ClubCard } from "@/components/community/ClubCard.tsx";

const OG_TITLE = "Estadísticas de la comunidad · GaluchaStats";
const OG_DESC = "Cómo está cada hinchada: partidos marcados, Mufómetro medio, cábalas y yetas. Solo perfiles públicos.";

export async function generateMetadata() {
  const images = [{ url: "/estadisticas/imagen", width: 1200, height: 630, alt: "Estadísticas de la comunidad de GaluchaStats" }];
  return {
    title: OG_TITLE,
    description: OG_DESC,
    openGraph: { title: OG_TITLE, description: OG_DESC, images, type: "website" as const },
    twitter: { card: "summary_large_image" as const, title: OG_TITLE, description: OG_DESC, images: images.map((i) => i.url) },
  };
}

export default async function CommunityPage() {
  const db = await getDb();
  const [overview, allClubs] = await Promise.all([communityOverview(db), listClubs(db)]);
  const clubs = visibleClubs(allClubs);
  const stats = new Map(overview.clubs.map((c) => [c.clubId, c]));
  const name = (id: string) => clubs.find((c) => c.id === id)?.shortName ?? id;
  const ready = overview.clubs.filter((c) => c.attended !== null && clubs.some((k) => k.id === c.clubId));

  const rank = (score: (c: ClubCommunity) => number | null) =>
    rankDesc(
      ready.filter((c) => score(c) !== null),
      (c) => score(c)!,
      (c) => name(c.clubId),
    ).slice(0, 8);
  const byAttended = rank((c) => c.attended);
  const byEff = rank((c) => c.avgEffectiveness);
  const byFaith = rank((c) => c.avgAttended);

  // Clubes con hinchas primero (más hinchas arriba), luego el resto alfabético.
  const ordered = [...clubs].sort(
    (a, b) => (stats.get(b.id)?.fans ?? 0) - (stats.get(a.id)?.fans ?? 0) || a.shortName.localeCompare(b.shortName, "es"),
  );

  return (
    <div className="stack">
      <div>
        <h1 className="section-title">Estadísticas de la comunidad</h1>
        <p className="muted">
          Cómo está cada hinchada, sumando lo que marcan todos los hinchas con perfil público. Para que nadie quede
          identificado, las cifras de un club aparecen desde 5 hinchas. Solo por entretención.
        </p>
      </div>

      <section className="grid grid-3 cm-totals">
        <div className="card stat">
          <span className="stat-value">{overview.totalFans}</span>
          <span className="stat-label">{overview.totalFans === 1 ? "hincha con perfil público" : "hinchas con perfil público"}</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{overview.totalAttended ?? "—"}</span>
          <span className="stat-label">partidos marcados entre todos</span>
        </div>
        <div className="card stat">
          <span className="stat-value">{ready.length}</span>
          <span className="stat-label">{ready.length === 1 ? "club con cifras abiertas" : "clubes con cifras abiertas"}</span>
        </div>
      </section>

      {ready.length > 0 ? (
        <section className="grid grid-2">
          <ClubRanking title="Más partidos marcados" note="Total de la hinchada" items={byAttended} name={name} value={(c) => c.attended!} />
          <ClubRanking
            title="Mufómetro medio"
            note="Efectividad promedio de los hinchas"
            items={byEff}
            name={name}
            value={(c) => c.avgEffectiveness!}
            label={(c) => pct(c.avgEffectiveness)}
            max={100}
          />
          <ClubRanking
            title="Hinchada más fiel"
            note="Partidos marcados por hincha"
            items={byFaith}
            name={name}
            value={(c) => c.avgAttended!}
            label={(c) => c.avgAttended!.toFixed(1)}
          />
        </section>
      ) : (
        <section className="card cm-empty">
          <strong>Todavía no hay un club con 5 hinchas públicos.</strong>
          <p className="muted" style={{ margin: 0 }}>
            Apenas una hinchada llegue a 5, aparecerán aquí los rankings de clubes. ¿Eres de los que se anima? Crea tu
            carnet, marca tus partidos y deja tu perfil público para sumar a tu hinchada.
          </p>
          <Link href="/registro" className="btn" style={{ alignSelf: "flex-start" }}>
            Crear carnet
          </Link>
        </section>
      )}

      <section className="stack">
        <h2 style={{ margin: 0 }}>Hinchada por hinchada</h2>
        <div className="cm-clubs">
          {ordered
            .filter((t) => (stats.get(t.id)?.fans ?? 0) > 0)
            .map((t) => (
              <ClubCard key={t.id} team={t} stats={stats.get(t.id)} />
            ))}
        </div>
        {ordered.some((t) => !stats.get(t.id)?.fans) && (
          <p className="muted small">
            Aún sin hinchas con perfil público:{" "}
            {ordered
              .filter((t) => !stats.get(t.id)?.fans)
              .map((t, i) => (
                <span key={t.id}>
                  {i > 0 && ", "}
                  <Link href={`/estadisticas/${t.id}`}>{t.shortName}</Link>
                </span>
              ))}
            .
          </p>
        )}
        <p className="muted small">
          ¿Quieres más? El ranking individual por club está en <Link href="/rankings">Rankings</Link>.
        </p>
      </section>
    </div>
  );
}

function ClubRanking({
  title,
  note,
  items,
  name,
  value,
  label,
  max,
}: {
  title: string;
  note: string;
  items: { rank: number; item: ClubCommunity }[];
  name: (id: string) => string;
  value: (c: ClubCommunity) => number;
  label?: (c: ClubCommunity) => string;
  max?: number;
}) {
  return (
    <div className="card stack">
      <div>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span className="muted small">{note}</span>
      </div>
      <HBars
        max={max}
        items={items.map((r) => ({
          key: r.item.clubId,
          label: `${r.rank}. ${name(r.item.clubId)}`,
          value: value(r.item),
          valueLabel: label?.(r.item),
          href: `/estadisticas/${r.item.clubId}`,
        }))}
      />
    </div>
  );
}
