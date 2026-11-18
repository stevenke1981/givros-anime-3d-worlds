import { expect, test } from '@playwright/test';
import { scenes } from '../src/world/catalog.js';

async function chooseScene(page, id) {
  await page.getByRole('button', { name: '場景選單' }).click();
  const menu = page.getByRole('dialog', { name: '選擇場景' });
  await menu.locator('[data-scene-choice="' + id + '"]').click();
}

test('the release menu opens every world and each entrance supports walking', async ({ page }, info) => {
  test.setTimeout(540_000);
  await page.setViewportSize({ width: 1000, height: 650 });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  const explorer = page.locator('#explorer');
  const canvas = page.locator('#world');
  const visibleDetails = new Set();
  await page.goto('./?trace-walk&trace-splats');
  await expect(explorer).toHaveAttribute('data-state', 'ready', { timeout: 70_000 });

  await page.getByRole('button', { name: '場景選單' }).click();
  const menu = page.getByRole('dialog', { name: '選擇場景' });
  await expect(menu.locator('[data-scene-choice]')).toHaveCount(10);
  await expect(menu.locator('[data-scene-choice="01"]')).toHaveAttribute('aria-current', 'true');
  await page.keyboard.press('Escape');

  for (const scene of scenes) {
    if (scene.id !== '01') await chooseScene(page, scene.id);
    await expect(explorer).toHaveAttribute('data-scene', scene.id, { timeout: 70_000 });
    await expect(explorer).toHaveAttribute('data-mode', 'scenic');
    await expect(explorer).toHaveAttribute('data-lighting', 'hdr-post');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(scene.name);
    const trail = scene.id === '01' ? 'meadow' : 'trail';
    await expect(page.locator(`[data-view="${trail}"]`)).toHaveAttribute('aria-pressed', 'true');
    const regionalDetails = new Set();
    for (const [view, label] of [[trail, 'trail'], ['overview', 'overview'], [scene.id === '01' ? 'shrine' : 'landmark', 'landmark']]) {
      if (view !== trail) await page.locator(`[data-view="${view}"]`).click();
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const counts = JSON.parse(await canvas.getAttribute('data-gaussian-counts'));
      expect(Object.values(counts).reduce((sum, value) => sum + value, 0)).toBeLessThanOrEqual(2100);
      for (const [kind, count] of Object.entries(counts)) {
        if (count > 0) regionalDetails.add(kind);
      }
      await page.screenshot({ path: info.outputPath(scene.id + '-' + label + '.png') });
    }
    for (const kind of regionalDetails) visibleDetails.add(kind);
    if (scene.id !== '01') {
      for (const kind of ['turf', 'tree', 'mountain', 'shrub']) {
        expect.soft(regionalDetails.has(kind), `${scene.name} ${kind}`).toBe(true);
      }
    }
    await page.getByRole('button', { name: '開始散步' }).click();
    await expect(explorer).toHaveAttribute('data-mode', 'walk');
    const origin = await canvas.getAttribute('data-walk-position');
    await page.keyboard.down('w');
    try {
      await expect(canvas).not.toHaveAttribute('data-walk-position', origin, { timeout: 20_000 });
    } finally {
      await page.keyboard.up('w');
    }
    await page.getByRole('button', { name: '回入口' }).click();
    await expect(canvas).toHaveAttribute('data-walk-position', origin);
    await page.getByRole('button', { name: '回全景' }).click();
  }
  await expect(page).toHaveURL(/scene=10/);
  expect([...visibleDetails].sort()).toEqual(['blossom', 'mountain', 'shrub', 'tree', 'turf']);
  expect(errors).toEqual([]);
});

test('a newer menu choice wins when an older world is still loading', async ({ page }) => {
  test.setTimeout(150_000);
  await page.setViewportSize({ width: 1000, height: 650 });
  await page.goto('./?scene=02&splats=off&trace-splats');
  const explorer = page.locator('#explorer');
  await expect(explorer).toHaveAttribute('data-scene', '02', { timeout: 70_000 });
  await expect(page.locator('#world')).not.toHaveAttribute('data-gaussian-counts');

  let revealRequest;
  let releaseRequest;
  const reached = new Promise((resolve) => { revealRequest = resolve; });
  const paused = new Promise((resolve) => { releaseRequest = resolve; });
  await page.route('**/models/fishing-boat.glb', async (route) => {
    revealRequest();
    await paused;
    await route.continue();
  });
  try {
    await chooseScene(page, '08');
    await reached;
    await chooseScene(page, '09');
    await chooseScene(page, '10');
  } finally {
    releaseRequest();
  }
  await expect(explorer).toHaveAttribute('data-scene', '10', { timeout: 90_000 });
  await expect(page).toHaveURL(/scene=10/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('夏祭燈籠山村');
});

test('a failed model preserves the retry message when a remaining model finishes', async ({ page }) => {
  const explorer = page.locator('#explorer');
  await page.goto('./');
  await expect(explorer).toHaveAttribute('data-scene', '01', { timeout: 70_000 });
  let releaseModel;
  const pausedModel = new Promise((resolve) => { releaseModel = resolve; });
  await page.route('**/models/baked/onsen-pool.glb', async (route) => {
    await pausedModel;
    await route.continue();
  });
  await page.route('**/models/baked/snow-inn.glb', (route) => route.fulfill({ status: 404 }));

  const remainingModel = page.waitForResponse('**/models/baked/onsen-pool.glb');
  try {
    await chooseScene(page, '07');
    await expect(explorer).toHaveAttribute('data-state', 'error');
  } finally {
    releaseModel();
  }
  const remainingResponse = await remainingModel;
  expect(remainingResponse.ok()).toBe(true);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('status')).toContainText('無法載入「雪國溫泉山村」');
  await expect(explorer).toHaveAttribute('data-scene', '01');
  await page.unroute('**/models/baked/snow-inn.glb');
  await page.getByRole('button', { name: '重新載入' }).click();
  await expect(explorer).toHaveAttribute('data-scene', '07', { timeout: 70_000 });
});
