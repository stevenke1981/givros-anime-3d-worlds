import { expect, test } from '@playwright/test';

async function sampleFrame(page, path) {
  const screenshot = await page.screenshot({ path });
  return page.evaluate(async (encoded) => {
    const image = await fetch('data:image/png;base64,' + encoded);
    const bitmap = await createImageBitmap(await image.blob());
    const canvas = new OffscreenCanvas(144, 90);
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return [...context.getImageData(0, 0, canvas.width, canvas.height).data];
  }, screenshot.toString('base64'));
}

function frameDifference(first, second) {
  const sum = first.reduce((total, value, index) => total + Math.abs(value - second[index]), 0);
  return sum / (first.length * 255);
}

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
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const entrance = await sampleFrame(page, info.outputPath('entrance.png'));

  await page.keyboard.down('w');
  try {
    await expect.poll(async () => frameDifference(entrance, await sampleFrame(page)),
      { timeout: 25_000 }).toBeGreaterThan(0.008);
  } finally {
    await page.keyboard.up('w');
  }
  await page.getByRole('button', { name: '回入口' }).click();
  await page.mouse.move(720, 450);
  // A grove can retain its previous LOD near a distance threshold.
  await expect.poll(async () => frameDifference(entrance, await sampleFrame(page)),
    { timeout: 25_000 }).toBeLessThan(0.003);

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
