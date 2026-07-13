import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // permite abrir desde el teléfono en la red local durante pruebas (npm run dev -- --host)
    port: 5173,
  },
});
