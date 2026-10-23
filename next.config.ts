import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // node:sqlite es un módulo nativo de Node; nunca debe empaquetarse para el cliente.
  serverExternalPackages: [],
  typedRoutes: false,
};

export default nextConfig;
