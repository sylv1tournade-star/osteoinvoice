import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['stamp-default.png', 'icon-512.png'],
      manifest: {
        name: 'OsteoFacture',
        short_name: 'OsteoFacture',
        description: 'Facturation ostéopathique simplifiée',
        theme_color: '#0d9488',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Nouvelle facture',
            short_name: 'Facture',
            url: '/?tab=invoice',
            icons: [{ src: 'icon-512.png', sizes: '512x512' }],
          },
          {
            name: 'Historique',
            short_name: 'Historique',
            url: '/?tab=history',
            icons: [{ src: 'icon-512.png', sizes: '512x512' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
})
