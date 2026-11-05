import Link from "next/link";

/**
 * Enlace al resumen anual de un hincha, para montar en el carnet.
 * `year` por defecto: el año en curso (si ese año aún no tiene partidos, la página lo dice con simpatía).
 */
export function ResumenLink({ username, year, className = "btn btn-ghost" }: { username: string; year?: number; className?: string }) {
  const y = year ?? new Date().getFullYear();
  return (
    <Link className={className} href={`/hincha/${encodeURIComponent(username)}/resumen/${y}`}>
      Tu año en la galería {y}
    </Link>
  );
}
