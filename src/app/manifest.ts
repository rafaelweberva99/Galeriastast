import type { MetadataRoute } from "next";

/** Datos para "Agregar a pantalla de inicio" (iPhone y Android): nombre, colores e íconos. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GaluchaStats",
    short_name: "GaluchaStats",
    description: "Tu Galería de hincha del fútbol chileno: ¿eres cábala o yeta?",
    start_url: "/",
    display: "standalone",
    background_color: "#0c110e",
    theme_color: "#0c110e",
    lang: "es-CL",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
