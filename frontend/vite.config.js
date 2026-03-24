import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Dockerコンテナ外部からアクセスできるようにする
    port: 5173,
    watch: {
      usePolling: true, // Dockerのボリュームマウント環境でもホットリロードが効くようにする
    },
    allowedHosts: true, // すべてのホスト名からのアクセスを許可 ("www.yokoyamateam.com"等)
    proxy: {
      '/socket.io': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        ws: true
      },
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
})
