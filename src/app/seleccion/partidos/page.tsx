import { PartidosView, type PartidosSearch } from "@/components/PartidosView.tsx";
import { clubIdentity, clubStyle } from "@/lib/clubTheme.ts";
import { getDb } from "@/lib/db/client.ts";
import { requireUser } from "@/lib/auth.ts";
import { getTeam, SELECCION_ID } from "@/lib/repo/teams.ts";

export const metadata = { title: "Marcar partidos de La Roja · GaluchaStats" };

export default async function SeleccionMatchesPage({ searchParams }: { searchParams: Promise<PartidosSearch> }) {
  await requireUser();
  const team = (await getTeam(await getDb(), SELECCION_ID))!;
  return (
    <div className="mode-seleccion" style={clubStyle(clubIdentity(team)) as React.CSSProperties}>
      <PartidosView sp={await searchParams} mode="seleccion" />
    </div>
  );
}
