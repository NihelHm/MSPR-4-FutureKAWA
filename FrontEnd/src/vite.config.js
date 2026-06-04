import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy pour éviter les CORS en dev (optionnel)
    proxy: {
      "/api/bresil": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bresil/, ""),
      },
      "/api/equateur": {
        target: "http://localhost:8001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/equateur/, ""),
      },
      "/api/colombie": {
        target: "http://localhost:8002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/colombie/, ""),
      },
    },
  },
});
