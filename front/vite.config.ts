/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

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

  // Sin VITE_SITIO_URL, index.html publica URLs relativas en Open Graph y las vistas previas de un
  // enlace salen sin imagen. Avisa al compilar en lugar de cortar el build (CI y builds locales).
  const avisarSiFaltaLaUrlDelSitio: Plugin = {
    name: 'avisar-si-falta-la-url-del-sitio',
    apply: 'build' as const,
    buildStart() {
      if (!env.VITE_SITIO_URL?.trim()) {
        this.warn('VITE_SITIO_URL está vacía: las etiquetas Open Graph van a quedar con URLs relativas.')
      }
    },
  }

  return {
    plugins: [react(), tailwindcss(), avisarSiFaltaLaUrlDelSitio],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    // Mitiga barrel imports (lucide-react): pre-bundling + chunk manual.
    optimizeDeps: { include: ["lucide-react", "@tanstack/react-query"] },
    build: { chunkSizeWarningLimit: 600 },
    server: { proxy, headers },
    preview: { proxy, headers },
    test: {
      environment: 'jsdom',
      // Sin globals: cada test importa describe/it/expect de vitest, igual que en el back.
      globals: false,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
