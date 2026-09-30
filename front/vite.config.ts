import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // El navegador solo habla con el Servidor Web (front). El Web Server reenvía
  // /api al Servidor de Aplicaciones (back), como en la vista de despliegue.
  // API_URL no lleva prefijo VITE_: es config del servidor, no llega al navegador.
  const proxy = {
    '/api': {
      target: env.API_URL ?? 'http://localhost:3000',
      changeOrigin: true,
    },
  }

  // Permite que el popup de Google Identity Services le devuelva la credencial
  // a la página (recomendación de Google para el login con popup).
  const headers = { 'Cross-Origin-Opener-Policy': 'same-origin-allow-popups' }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: { proxy, headers },
    preview: { proxy, headers },
  }
})
