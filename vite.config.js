import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.png", "apple-touch-icon.png"],
      manifest: {
        name: "Pisos Mecánicos — Hyatt Regency Cartagena",
        short_name: "Pisos Mecánicos",
        description: "Revisión diaria de equipos, cuartos fríos, medidores, inventario, mantenimiento y horarios.",
        start_url: "/",
        display: "standalone",
        background_color: "#0f1b2b",
        theme_color: "#d97706",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      },
    }),
  ],
  server: {
    host: true, // permite abrir desde el teléfono en la red local durante pruebas (npm run dev -- --host)
    port: 5173,
  },
});
