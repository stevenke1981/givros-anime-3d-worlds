import { expect, test } from '@playwright/test';

test('the release loads its models, changes viewpoints, and responds to keyboard movement', async ({ page }, info) => {
  const errors = [];
  const modelResponses = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.endsWith('.glb')) modelResponses.push(response);
  });

  await page.goto('./');
  const explorer = page.locator('#explorer');
  await expect(explorer).toHaveAttribute('data-state', 'ready', { timeout: 45_000 });
  expect(modelResponses.length).toBeGreaterThanOrEqual(6);
  for (const response of modelResponses) {
    expect(response.ok()).toBe(true);
    expect(new URL(response.url()).pathname).toMatch(/^\/sakura\/models\//);
  }
  const initial = await page.screenshot({ path: info.outputPath('overview.png') });

  const shrine = page.getByRole('button', { name: '神社', exact: true });
  await shrine.click();
  await expect(shrine).toHaveAttribute('aria-pressed', 'true');
  const shrineView = await page.screenshot({ path: info.outputPath('shrine.png') });
  expect(shrineView.equals(initial)).toBe(false);

  const start = page.getByRole('button', { name: '開始散步' });
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(explorer).toHaveAttribute('data-mode', 'walk');
  await expect(page.locator('#world')).toBeFocused();
  await page.mouse.move(720, 450);
  const entrance = await page.screenshot({ path: info.outputPath('entrance.png') });

  await page.keyboard.down('w');
  try {
    await expect.poll(async () => !(await page.screenshot()).equals(entrance), { timeout: 25_000 }).toBe(true);
  } finally {
    await page.keyboard.up('w');
  }
  await page.getByRole('button', { name: '回入口' }).click();
  await page.mouse.move(720, 450);
  await expect.poll(async () => (await page.screenshot()).equals(entrance), { timeout: 25_000 }).toBe(true);

  await page.getByRole('button', { name: '操作說明' }).click();
  await expect(page.getByRole('dialog', { name: '操作說明' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(explorer).toHaveAttribute('data-mode', 'walk');
  await page.keyboard.press('Escape');
  await expect(explorer).toHaveAttribute('data-mode', 'scenic');
  await expect(start).toBeFocused();
  expect(errors).toEqual([]);
});

test('a touch viewport exposes walking controls and keeps navigation usable', async ({ browser }, info) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  try {
    const page = await context.newPage();
    await page.goto(new URL('./', info.project.use.baseURL).href);
    const explorer = page.locator('#explorer');
    await expect(explorer).toHaveAttribute('data-state', 'ready', { timeout: 45_000 });
    await page.screenshot({ path: info.outputPath('mobile.png') });
    await page.getByRole('button', { name: '開始散步' }).tap();
    await expect(page.getByRole('button', { name: '向前' })).toBeVisible();
    await page.getByRole('button', { name: '回全景' }).tap();
    await expect(explorer).toHaveAttribute('data-mode', 'scenic');
  } finally {
    await context.close();
  }
});

test('the explorer reports an unavailable WebGL context and offers retry', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...options) {
      if (type === 'webgl2') return null;
      return getContext.call(this, type, ...options);
    };
  });
  await page.goto('./');
  await expect(page.getByRole('status')).toContainText('WebGL 2');
  await expect(page.getByRole('button', { name: '重新載入' })).toBeVisible();
});
