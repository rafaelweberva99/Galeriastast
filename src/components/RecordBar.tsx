import type { TeamRecord } from "@/lib/domain/types.ts";

export function RecordBar({ record }: { record: TeamRecord }) {
  if (!record.played) return <div className="recordbar" aria-label="Sin partidos" />;
  const w = (n: number) => `${(n / record.played) * 100}%`;
  return (
    <div
      className="recordbar"
      role="img"
      aria-label={`${record.won} ganados, ${record.drawn} empatados, ${record.lost} perdidos`}
    >
      <span style={{ width: w(record.won), background: "var(--win)" }} />
      <span style={{ width: w(record.drawn), background: "var(--draw)" }} />
      <span style={{ width: w(record.lost), background: "var(--loss)" }} />
    </div>
  );
}
