import { PartidosView, type PartidosSearch } from "@/components/PartidosView.tsx";

export const metadata = { title: "Marcar partidos · GaluchaStats" };

export default async function MatchesPage({ searchParams }: { searchParams: Promise<PartidosSearch> }) {
  return <PartidosView sp={await searchParams} mode="liga" />;
}
