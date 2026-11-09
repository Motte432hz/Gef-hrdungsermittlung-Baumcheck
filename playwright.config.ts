import { defineConfig, devices } from '@playwright/test'

// Locally only Chromium is installed; CI sets ALL_BROWSERS=1 to also run WebKit (Safari) and Firefox.
const allBrowsers = !!process.env.ALL_BROWSERS
const PORT = 4173
// Fake camera for tests of the in-app camera (Chromium only).
const fakeCamera = {
  launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    // Reference width from CLAUDE.md: ~380 px
    {
      name: 'phone-380',
      use: {
        ...devices['Desktop Chrome'],
        ...fakeCamera,
        viewport: { width: 380, height: 800 },
        hasTouch: true,
      },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], ...fakeCamera, viewport: { width: 834, height: 1112 } },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], ...fakeCamera, viewport: { width: 1366, height: 860 } },
    },
    ...(allBrowsers
      ? [
          { name: 'iphone-webkit', use: { ...devices['iPhone 13'] } },
          { name: 'ipad-webkit', use: { ...devices['iPad (gen 7)'] } },
          { name: 'android-pixel', use: { ...devices['Pixel 7'], ...fakeCamera } },
          { name: 'desktop-firefox', use: { ...devices['Desktop Firefox'] } },
        ]
      : []),
  ],
  webServer: {
    // Production build, so the service worker and offline mode are really tested.
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
