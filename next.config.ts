import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Política de contenido (CSP). Todo se sirve desde el mismo dominio:
 *  - script-src: 'unsafe-inline' porque Next.js inyecta scripts en línea para hidratar (sin nonces);
 *    'wasm-unsafe-eval' para el OCR (Tesseract compila WebAssembly en su worker). En desarrollo, el
 *    recargado en caliente necesita 'unsafe-eval'.
 *  - worker-src blob: porque Tesseract arranca su worker desde un blob que importa /vendor/tesseract.
 *  - style-src 'unsafe-inline' por los estilos en línea de React (colores del club).
 *  - img-src data:/blob: para las capturas que se previsualizan y las camisetas SVG.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' data: blob:${isDev ? " ws:" : ""}`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // HTTPS obligatorio por 2 años (Vercel ya sirve todo con HTTPS; en localhost los navegadores lo ignoran).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // node:sqlite es un módulo nativo de Node; nunca debe empaquetarse para el cliente.
  serverExternalPackages: [],
  typedRoutes: false,
  poweredByHeader: false,
  // Las tipografías de la imagen para compartir se leen con fs: que viajen con la función en Vercel.
  outputFileTracingIncludes: { "/hincha/[username]/tarjeta": ["./src/lib/fonts/*"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
