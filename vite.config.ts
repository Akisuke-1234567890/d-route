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
      includeAssets: ['icons/d-route-mark.svg', 'icons/apple-touch-icon.svg'],
      manifest: {
        name: 'D Route',
        short_name: 'D Route',
        description: 'グループで目的地とRouteを共有するアプリ',
        theme_color: '#10152d',
        background_color: '#090d20',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        orientation: 'portrait-primary',
        icons: [
          { src: 'icons/d-route-mark.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/d-route-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
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
