import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts: true,  // Allow all hosts for Cloudflare proxy
    hmr: false  // Disable WebSocket HMR connections
  },
  build: {
    // Disable HMR and WebSocket client injection in production build
    minify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined
      }
    }
  }
})
