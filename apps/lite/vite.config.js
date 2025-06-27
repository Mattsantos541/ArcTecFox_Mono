// Add this to vite.config.js if WebSocket issues persist
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    hmr: false,  // Disable hot module replacement temporarily
  },
})