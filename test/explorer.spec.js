import { expect, test } from '@playwright/test';

test.afterEach(async ({ page }) => {
  // Let the explorer's pagehide handler dispose of its WebGL resources before teardown.
  if (!page.isClosed()) await page.goto('about:blank');
});

test('the release loads its models, changes viewpoints, and responds to keyboard movement', async ({ page }, info) => {
  const errors = [];
  const modelResponses = [];
  await page.addInitScript(() => {
    const gl = WebGL2RenderingContext.prototype;
    const gaussianShaders = new WeakSet();
    const gaussianPrograms = new WeakSet();
    const activePrograms = new WeakMap();
    const windUniforms = new WeakMap();
    const { shaderSource, attachShader, useProgram, drawElementsInstanced, getUniformLocation, uniform1f } = gl;
    window.gaussianDraws = 0;
    window.windStrength = null;
    window.windTimes = new Set();
    gl.getUniformLocation = function (program, name) {
      const location = getUniformLocation.call(this, program, name);
      if (location && name.startsWith('vegetationWind')) windUniforms.set(location, name);
      return location;
    };
    gl.uniform1f = function (location, value) {
      const name = windUniforms.get(location);
      if (name === 'vegetationWindStrength') window.windStrength = value;
      if (name === 'vegetationWindTime') window.windTimes.add(value);
      return uniform1f.call(this, location, value);
    };
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
  await expect(explorer).toHaveAttribute('data-lighting', 'hdr-post');
  expect(modelResponses.length).toBeGreaterThanOrEqual(6);
  for (const response of modelResponses) {
    expect(response.ok()).toBe(true);
    expect(new URL(response.url()).pathname).toMatch(/^\/sakura\/models\//);
  }
  for (const asset of ['meadow-grass', 'wild-azalea', 'sakura-canopy', 'valley-broadleaf-canopy', 'shore-reeds', 'rice-arching', 'duckweed']) {
    expect(modelResponses.some((response) => new URL(response.url()).pathname.endsWith('/' + asset + '.glb'))).toBe(true);
  }
  for (const asset of ['bridge', 'house']) {
    expect(modelResponses.some((response) => new URL(response.url()).pathname.endsWith(`/models/baked/${asset}.glb`))).toBe(true);
  }
  await expect(page.getByRole('button', { name: '溪岸步道' })).toHaveAttribute('aria-pressed', 'true');
  const initial = await page.screenshot({ path: info.outputPath('meadow.png') });

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
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => window.windStrength === 1 && window.windTimes.size >= 3, null, { timeout: 20_000 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForFunction(() => window.windStrength === 0, null, { timeout: 20_000 });
  expect(errors).toEqual([]);
});
