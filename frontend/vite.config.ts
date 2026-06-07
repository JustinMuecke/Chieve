import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api/achievements': {
        target: process.env.ACHIEVEMENT_SERVICE_URL ?? 'http://localhost:8001',
        changeOrigin: true,
      },
      '/api/user': {
        target: process.env.USER_SERVICE_URL ?? 'http://localhost:8000',
        changeOrigin: true,
      },
      '/api/recommendations': {
        target: process.env.RECOMMENDATION_SERVICE_URL ?? 'http://localhost:8002',
        changeOrigin: true,
      },
    },
  },
})
