import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
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
      workbox: {
        // No cachear las llamadas a Supabase/API: siempre deben ir a la red para traer datos frescos.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.hostname.endsWith("supabase.co"),
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  server: {
    host: true, // permite abrir desde el teléfono en la red local durante pruebas (npm run dev -- --host)
    port: 5173,
  },
});
