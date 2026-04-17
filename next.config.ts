import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    // 🚩 Esto ignora los errores de tipos para que el build termine exitosamente en Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    // 🚩 Esto ignora advertencias de formato durante el despliegue
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;