// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),  // only React plugin here
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: [
      'b4e41ee1-2b38-4726-b238-4a8f797ea7df-00-29exdnoe4vtox.worf.replit.dev'
    ],
    hmr: {
      protocol: 'wss',
      host: 'b4e41ee1-2b38-4726-b238-4a8f797ea7df-00-29exdnoe4vtox.worf.replit.dev',
      clientPort: 443,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
