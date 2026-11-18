import { expect, test } from '@playwright/test';

test('the release loads its models, changes viewpoints, and responds to keyboard movement', async ({ page }, info) => {
  const errors = [];
  const modelResponses = [];
  await page.addInitScript(() => {
    const gl = WebGL2RenderingContext.prototype;
    const gaussianShaders = new WeakSet();
    const gaussianPrograms = new WeakSet();
    const activePrograms = new WeakMap();
    const { shaderSource, attachShader, useProgram, drawElementsInstanced } = gl;
    window.gaussianDraws = 0;
    gl.shaderSource = function (shader, source) {
      if (source.includes('kernelPosition')) gaussianShaders.add(shader);
      return shaderSource.call(this, shader, source);
    };
    gl.attachShader = function (program, shader) {
      if (gaussianShaders.has(shader)) gaussianPrograms.add(program);
      return attachShader.call(this, program, shader);
    };
    gl.useProgram = function (program) {
      activePrograms.set(this, program);
      return useProgram.call(this, program);
    };
    gl.drawElementsInstanced = function (mode, count, type, offset, instances) {
      if (instances && gaussianPrograms.has(activePrograms.get(this))) window.gaussianDraws += 1;
      return drawElementsInstanced.call(this, mode, count, type, offset, instances);
    };
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.endsWith('.glb')) modelResponses.push(response);
  });

  await page.goto('./?trace-walk');
  const explorer = page.locator('#explorer');
  const canvas = page.locator('#world');
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
  await expect.poll(() => page.evaluate(() => window.gaussianDraws), { timeout: 20_000 }).toBeGreaterThan(0);
  const shrineView = await page.screenshot({ path: info.outputPath('shrine.png') });
  expect(shrineView.equals(initial)).toBe(false);

  const start = page.getByRole('button', { name: '開始散步' });
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(explorer).toHaveAttribute('data-mode', 'walk');
  await expect(canvas).toBeFocused();
  await expect(canvas).toHaveAttribute('data-walk-position', /^-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+$/);
  const origin = await canvas.getAttribute('data-walk-position');
  const [originX, , originZ] = origin.split(',').map(Number);
  await page.mouse.move(720, 450);
  await page.screenshot({ path: info.outputPath('entrance.png') });

  await page.keyboard.down('w');
  try {
    await expect.poll(async () => {
      const [x, , z] = (await canvas.getAttribute('data-walk-position')).split(',').map(Number);
      return Math.hypot(x - originX, z - originZ);
    }, { timeout: 25_000 }).toBeGreaterThan(0.12);
  } finally {
    await page.keyboard.up('w');
  }
  await page.getByRole('button', { name: '回入口' }).click();
  await expect(canvas).toHaveAttribute('data-walk-position', origin);

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
    await page.getByRole('button', { name: '場景選單' }).tap();
    const sceneMenu = page.getByRole('dialog', { name: '選擇場景' });
    await expect(sceneMenu.locator('[data-scene-choice]')).toHaveCount(10);
    await sceneMenu.locator('[data-scene-choice="07"]').tap();
    await expect(explorer).toHaveAttribute('data-scene', '07', { timeout: 70_000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('雪國溫泉山村');
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
