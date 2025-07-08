import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // ⬅️ You'll need this

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // ⬅️ Add this block
    }
  },
  build: {
    rollupOptions: {
      external: []
    }
  },
  optimizeDeps: {
    include: ['xlsx']
  },
  define: {
    global: 'globalThis'
  }
});
