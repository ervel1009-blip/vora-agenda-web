import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // 👈 Esto le dice a Tailwind que busque en tu carpeta de onboarding
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Aquí podemos agregar tus colores personalizados estilo Netflix mañana
    },
  },
  plugins: [],
};
export default config;