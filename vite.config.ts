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
      includeAssets: ['icons/d-route-mark.svg', 'icons/d-route-maskable.svg', 'icons/d-route-symbol.svg', 'icons/apple-touch-icon.svg', 'icons/d-route-192.png', 'icons/d-route-512.png', 'icons/d-route-maskable-512.png'],
      manifest: {
        name: 'D Route',
        short_name: 'D Route',
        description: '一人でもグループでも、予定と行動プランを組み立てられるアプリ',
        theme_color: '#090d20',
        background_color: '#090d20',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        orientation: 'portrait-primary',
        icons: [
          { src: 'icons/d-route-mark.svg?v=2.1.1-RC6', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/d-route-maskable.svg?v=2.1.1-RC6', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
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
