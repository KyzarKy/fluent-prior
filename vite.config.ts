// Vite serves the web app. In development it proxies /api to the local server on 8790,
// so the browser sees one origin, as it will in production.
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: { "/api": "http://localhost:8790" },
  },
});
