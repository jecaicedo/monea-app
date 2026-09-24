import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Tailwind v4 se integra como plugin de Vite: no hay tailwind.config.js ni
    // PostCSS aparte. Los tokens viven en src/styles/theme.css.
    tailwindcss(),
    VitePWA({
      // El service worker se actualiza solo cuando publicamos una version nueva.
      registerType: 'autoUpdate',
      includeAssets: ['monea.ico', 'monea.svg', 'monea-icon.png'],
      manifest: {
        name: 'Monea',
        short_name: 'Monea',
        description: 'Organiza tu plata, presupuesto y metas.',
        lang: 'es-CO',
        dir: 'ltr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // Colores del tema oscuro, que es el tema por defecto de la app.
        theme_color: '#0D0F12',
        background_color: '#0D0F12',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/monea-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any' },
          { src: '/monea-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/monea-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            // Sin un PNG maskable dedicado: este ya tiene fondo de borde a borde
            // y la marca centrada dentro de la zona segura, así que sirve para
            // los dos propósitos.
            src: '/monea-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Las fuentes van autoalojadas (woff2), asi que entran al cache y la
        // app se ve igual sin conexion.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
      devOptions: {
        // Permite probar la instalacion con `npm run dev`, sin hacer build.
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
