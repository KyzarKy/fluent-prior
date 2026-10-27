// Vite serves the web app. In development it proxies /api to the local server on 8790,
// so the browser sees one origin, as it will in production. Vitest reads the same file.
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5180,
    strictPort: true,
    proxy: { "/api": "http://localhost:8790" },
  },
  // Unit tests only. e2e/ is Playwright's (npm run e2e), and its *.spec.ts would otherwise
  // match Vitest's default pattern.
  test: { include: ["src/**/*.test.ts", "evals/**/*.test.ts"] },
});
