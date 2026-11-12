"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Aviso fijo mientras el hincha no haya marcado ningún partido: su carnet está vacío hasta entonces. */
export function OnboardingBanner() {
  const path = usePathname();
  // En estas páginas ya está cargando partidos (o no aplica).
  if (path === "/seleccion" || path.startsWith("/seleccion/")) return null;
  if (["/bienvenida", "/importar", "/partidos", "/ingresar", "/registro", "/aceptar", "/terminos", "/privacidad"].includes(path) || path.startsWith("/partidos/")) return null;
  return (
    <div className="onb-banner" role="status">
      <div className="container onb-row">
        <span>
          <strong>Tu Galería está vacía.</strong> Carga los partidos a los que has ido al estadio para ver tu Mufómetro.
        </span>
        <Link className="btn onb-btn" href="/bienvenida">
          Cargar partidos
        </Link>
      </div>
    </div>
  );
}
