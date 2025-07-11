// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
server: {
  host: '0.0.0.0',
  port: 5173,
  hmr: {
    host: 'jubilant-rotary-phone-4w5v79g67jj374jj-5173.app.github.dev', // REMOVE "https://"
    protocol: 'wss', // Use "wss" for secure websockets in Codespaces
  },
},

  build: {
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
    },
  },
  appType: 'spa', // Enable client-side routing for React Router
});
