import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
const base = process.env.GITHUB_ACTIONS && repositoryName ? `/${repositoryName}/` : '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/d-route-mark.svg', 'icons/d-route-maskable.svg', 'icons/d-route-symbol.svg', 'icons/d-route-192.png', 'icons/d-route-512.png', 'icons/d-route-maskable-512.png', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'D Route',
        short_name: 'D Route',
        description: 'グループで目的地とRouteを共有するアプリ',
        theme_color: '#15103d',
        background_color: '#091633',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        orientation: 'portrait-primary',
        icons: [
          { src: 'icons/d-route-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/d-route-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/d-route-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,ico,png,webmanifest}']
      }
    })
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    css: true
  }
});
