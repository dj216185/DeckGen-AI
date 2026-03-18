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
        target: "https://deckgen-ai.onrender.com" || "http://localhost:5001",
        changeOrigin: true
      },
      "/generate": {
        target: "https://deckgen-ai.onrender.com" || "http://localhost:5001",
        changeOrigin: true
      },
      "/status": {
        target: "https://deckgen-ai.onrender.com" || "http://localhost:5001",
        changeOrigin: true
      },
      "/download": {
        target: "https://deckgen-ai.onrender.com" || "http://localhost:5001",
        changeOrigin: true
      },
      "/download_search": {
        target: "https://deckgen-ai.onrender.com" || "http://localhost:5001",
        changeOrigin: true
      },
      "/themes": {
        target: "https://deckgen-ai.onrender.com" || "http://localhost:5001",
        changeOrigin: true
      }
    }
  }
});
