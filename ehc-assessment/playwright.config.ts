import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:4173',
    headless: true,
    screenshot: 'only-on-failure',
  },

  projects: [
    // --- Tier 1: Cross-browser functional tests ---
    {
      name: 'desktop-chromium',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'desktop-firefox',
      use: { browserName: 'firefox', viewport: { width: 1280, height: 800 } },
      testMatch: 'smoke.spec.ts',
    },
    {
      name: 'desktop-webkit',
      use: { browserName: 'webkit', viewport: { width: 1280, height: 800 } },
      testMatch: 'smoke.spec.ts',
    },

    // --- Tier 2: Mobile & tablet responsive tests ---
    {
      name: 'mobile-chrome',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
      },
      testMatch: ['responsive.spec.ts', 'visual-regression.spec.ts'],
    },
    {
      name: 'mobile-safari',
      use: {
        browserName: 'webkit',
        viewport: { width: 393, height: 852 },
        hasTouch: true,
        isMobile: true,
      },
      testMatch: ['responsive.spec.ts', 'visual-regression.spec.ts'],
    },
    {
      name: 'tablet-portrait',
      use: {
        browserName: 'webkit',
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
      },
      testMatch: ['responsive.spec.ts', 'visual-regression.spec.ts'],
    },
    {
      name: 'tablet-landscape',
      use: {
        browserName: 'chromium',
        viewport: { width: 1024, height: 768 },
        hasTouch: true,
      },
      testMatch: ['responsive.spec.ts', 'visual-regression.spec.ts'],
    },

    // --- Tier 3: Dark mode tests ---
    {
      name: 'dark-desktop',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 800 },
        colorScheme: 'dark',
      },
      testMatch: ['dark-mode.spec.ts', 'visual-regression.spec.ts'],
    },
    {
      name: 'dark-mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 667 },
        hasTouch: true,
        isMobile: true,
        colorScheme: 'dark',
      },
      testMatch: ['dark-mode.spec.ts', 'visual-regression.spec.ts'],
    },
    {
      name: 'dark-tablet',
      use: {
        browserName: 'chromium',
        viewport: { width: 768, height: 1024 },
        hasTouch: true,
        colorScheme: 'dark',
      },
      testMatch: ['dark-mode.spec.ts', 'visual-regression.spec.ts'],
    },
  ],

  webServer: {
    // Build without Supabase env vars to avoid real auth calls + loading gates in E2E,
    // then serve the production build.
    command: 'VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite build && npx vite preview --port 4173',
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
