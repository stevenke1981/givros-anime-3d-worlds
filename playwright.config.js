import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.js',
  workers: 1,
  timeout: 90_000,
  projects: [
    { name: 'desktop', testIgnore: ['**/explorer.spec.js', '**/touch.spec.js'] },
    { name: 'rendering', testMatch: '**/explorer.spec.js' },
    {
      name: 'touch',
      testMatch: '**/touch.spec.js',
      // The two scene loads can take 115 seconds on software WebGL.
      timeout: 150_000,
      use: {
        hasTouch: true,
        isMobile: true,
        viewport: { width: 390, height: 844 },
      },
    },
  ],
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
