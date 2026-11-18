import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const destination = resolve('release/lighting-comparison');
const shots = [
  ['01', 'meadow', 'sakura-creek'],
  ['04', 'trail', 'rice-terraces'],
];
if (process.argv.includes('--night')) shots.push(['10', 'trail', 'festival-night']);
await mkdir(destination, { recursive: true });

const server = await preview({ base: '/sakura/', preview: { host: '127.0.0.1', port: 0 } });
const site = `http://127.0.0.1:${server.httpServer.address().port}/sakura/`;
let browser;
try {
  browser = await chromium.launch({
    executablePath: process.env.SAKURA_CHROMIUM || undefined,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
  const errors = [];
  const evidence = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });

  for (const [scene, view, name] of shots) {
    const captures = [];
    for (const lighting of ['legacy', 'enhanced']) {
      await page.goto(`${site}?scene=${scene}&lighting=${lighting}&trace-lighting`);
      await page.locator(`#explorer[data-state="ready"][data-scene="${scene}"]`).waitFor({ timeout: 90_000 });
      const selected = page.locator(`[data-view="${view}"]`);
      if (await selected.getAttribute('aria-pressed') !== 'true') await selected.click();
      assert.equal(await page.locator('#explorer').getAttribute('data-lighting'), lighting === 'legacy' ? 'legacy' : 'hdr-post');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const canvas = page.locator('#world');
      const pose = await canvas.getAttribute('data-camera-pose');
      assert.ok(pose);
      const image = await canvas.screenshot({ path: resolve(destination, `${name}-${lighting}.png`) });
      captures.push({ pose, image });
    }
    assert.deepEqual(JSON.parse(captures[0].pose), JSON.parse(captures[1].pose), `${name} camera`);
    assert.ok(!captures[0].image.equals(captures[1].image), `${name} lighting`);
    evidence.push({ scene, view, camera: JSON.parse(captures[0].pose), legacy: `${name}-legacy.png`, enhanced: `${name}-enhanced.png` });
    console.log(`${name}: fixed camera verified, legacy and HDR+ACES captured`);
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(destination, 'camera-poses.json'), JSON.stringify(evidence, null, 2) + '\n');
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.httpServer.close(error => error ? reject(error) : resolve()));
}
