import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite es un módulo nativo de Node; nunca debe empaquetarse para el cliente.
  serverExternalPackages: [],
  typedRoutes: false,
  // Las tipografías de la imagen para compartir se leen con fs: que viajen con la función en Vercel.
  outputFileTracingIncludes: { "/hincha/[username]/tarjeta": ["./src/lib/fonts/*"] },
};

export default nextConfig;
