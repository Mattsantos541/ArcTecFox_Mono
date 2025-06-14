import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    allowedHosts: [process.env.VITE_PUBLIC_HOST || "all"],
    hmr: {
      host: process.env.VITE_PUBLIC_HOST || "all",
      protocol: "wss",
      clientPort: 443,
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
        // Optional: uncomment if backend doesn't have /api prefix in route definitions
        // rewrite: (path) => path.replace(/^\/api/, '')
      },
    },
  },
});
