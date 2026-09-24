import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The app calls the API on its own origin (API_BASE defaults to ""), so in
// dev Vite forwards API + WebSocket paths to the Python backend. Override
// the target with SAFESIGNAL_API_URL if the backend isn't on :8000.
const API_TARGET = process.env.SAFESIGNAL_API_URL || 'http://127.0.0.1:8000'
const API_PATHS = '^/(health|demo|auth|analyze-request|requests|verify|contacts|requesters|panic)(/|$)'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      [API_PATHS]: { target: API_TARGET, changeOrigin: true },
      '/ws': { target: API_TARGET.replace(/^http/, 'ws'), ws: true, changeOrigin: true },
    },
  },
})
