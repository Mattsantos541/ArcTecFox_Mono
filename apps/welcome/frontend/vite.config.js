import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false
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
})
