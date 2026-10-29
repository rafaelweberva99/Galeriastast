import Link from "next/link";
import { legalVersionLabel } from "@/lib/legal.ts";

/** Encabezado común de /terminos y /privacidad: título, versión y fecha. */
export function LegalHeader({ title, version, other }: { title: string; version: string; other: { href: string; label: string } }) {
  return (
    <header className="stack" style={{ gap: 10 }}>
      <h1 style={{ margin: 0 }}>{title}</h1>
      <p className="meta" style={{ margin: 0 }}>
        Versión {legalVersionLabel(version)} · Ver también: <Link href={other.href}>{other.label}</Link>
      </p>
    </header>
  );
}
