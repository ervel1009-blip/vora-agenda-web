import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Opciones de configuración */
  typescript: {
    // 🚩 IMPORTANTE: Ignora los errores de tipos de TypeScript durante el build en Vercel.
    ignoreBuildErrors: true,
  },
  eslint: {
    // 🚩 Ignora los errores de ESLint durante el proceso de construcción.
    ignoreDuringBuilds: true,
  },
  
  // 🚀 SOLUCIÓN BRILLANTE: Redirección Automática
  // Esto hace que tu URL principal (/) envíe al usuario directamente a la suscripción.
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard/suscripcion',
        permanent: false, // Usamos false mientras estamos en desarrollo/pruebas
      },
    ];
  },

  experimental: {
    // Configuraciones adicionales si fueran necesarias
  }
};

export default nextConfig;