import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  envDir: fileURLToPath(new URL("../../", import.meta.url)),
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api/v1": {
        target: "http://localhost:3000",
        changeOrigin: false,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        employer: "employer.html",
        candidates: "candidates.html",
        admin: "admin.html",
      },
    },
  },
});
