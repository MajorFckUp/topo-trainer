import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export const manifestIcons = [
  { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
  { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
];

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Topo Trainer',
        short_name: 'Topo',
        lang: 'nl',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '.',
        scope: '.',
        theme_color: '#066AFE',
        background_color: '#ffffff',
        icons: manifestIcons,
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,webp,png,svg,json,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
      },
    }),
  ],
  test: { environment: 'jsdom', setupFiles: ['src/test/setup.ts'], globals: true, exclude: ['e2e/**', 'node_modules/**'] },
});
