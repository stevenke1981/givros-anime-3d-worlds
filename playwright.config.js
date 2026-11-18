import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  workers: 1,
  timeout: 90_000,
  use: {
    baseURL: 'http://127.0.0.1:4182/sakura/',
    viewport: { width: 1440, height: 900 },
    reducedMotion: 'reduce',
    launchOptions: {
      executablePath: process.env.SAKURA_CHROMIUM || undefined,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: {
    command: 'npm run preview -- --port 4182 --strictPort --base /sakura/',
    url: 'http://127.0.0.1:4182/sakura/',
  },
});
