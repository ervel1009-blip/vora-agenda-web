import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // ⛔ COMENTAMOS LA REDIRECCIÓN PARA QUE EL INICIO SEA LIBRE
  /*
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard/suscripcion',
        permanent: false,
      },
    ];
  },
  */

  experimental: {
    // Configuraciones adicionales si fueran necesarias
  }
};

export default nextConfig;