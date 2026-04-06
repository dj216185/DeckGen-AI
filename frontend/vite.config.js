import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5176,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true
      },
      "/generate": {
        target: "http://localhost:5001",
        changeOrigin: true
      },
      "/status": {
        target: "http://localhost:5001",
        changeOrigin: true
      },
      "/download": {
        target: "http://localhost:5001",
        changeOrigin: true
      },
      "/download_search": {
        target: "http://localhost:5001",
        changeOrigin: true
      },
      "/themes": {
        target: "http://localhost:5001",
        changeOrigin: true
      }
    }
  }
});
