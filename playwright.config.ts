import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
  use: { baseURL: 'http://localhost:4173', viewport: { width: 1334, height: 800 }, hasTouch: true, isMobile: true },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
