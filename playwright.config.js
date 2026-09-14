import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.PLAYWRIGHT_PORT || '4180';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  reporter: 'line',
  use: {
    colorScheme: 'light',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'root',
      testMatch: /root-deployment\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://127.0.0.1:${e2ePort}/`,
      },
    },
    {
      name: 'github-pages',
      testIgnore: /root-deployment\.spec\.js/,
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://127.0.0.1:${e2ePort}/ContextPacker/`,
      },
    },
  ],
  webServer: {
    command: `npm run build && node e2e/preview-server.mjs --port=${e2ePort}`,
    url: `http://127.0.0.1:${e2ePort}/`,
    reuseExistingServer: false,
  },
});
