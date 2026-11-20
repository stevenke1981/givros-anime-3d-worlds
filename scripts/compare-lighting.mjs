import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const compareSurfaces = process.argv.includes('--surfaces');
const baselineArg = process.argv.indexOf('--baseline-dist');
const baselineDist = baselineArg === -1 ? null : process.argv[baselineArg + 1];
if (baselineArg !== -1 && (!baselineDist || baselineDist.startsWith('--'))) throw new Error('Expected a built dist directory after --baseline-dist');
const terraceOnly = process.argv.includes('--terrace');
const compareDaylight = terraceOnly || Boolean(baselineDist) || process.argv.includes('--daylight');
const destination = resolve(terraceOnly ? 'release/terrace-water-study' : baselineDist ? 'release/creek-terrace-refinement' : compareDaylight ? 'release/daylight-comparison' :
  compareSurfaces ? 'release/physical-surface-comparison' : 'release/lighting-comparison');
const shots = terraceOnly ? [
  ['04', 'trail', 'terrace-entry'],
  ['04', 'fields', 'flooded-fields'],
  ['04', 'landmark', 'sluice-and-farmhouses'],
] : [
  ['01', 'meadow', 'sakura-creek'],
  ['04', 'trail', 'rice-terraces'],
];
if (!terraceOnly && compareSurfaces && !compareDaylight) shots.push(['08', 'waterfront', 'coastal-waterfront']);
if (!terraceOnly && compareDaylight) {
  shots.push(['01', 'bridge', 'bridge-and-water'], ['04', 'fields', 'flooded-fields']);
} else if (!terraceOnly && process.argv.includes('--night')) {
  shots.push(['10', 'trail', 'festival-night']);
}
await mkdir(destination, { recursive: true });

const server = await preview({ base: '/sakura/', preview: { host: '127.0.0.1', port: 0 } });
const site = `http://127.0.0.1:${server.httpServer.address().port}/sakura/`;
let previous;
let browser;
try {
  if (baselineDist) previous = await preview({
    base: '/sakura/', build: { outDir: resolve(baselineDist) }, preview: { host: '127.0.0.1', port: 0 },
  });
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
      const daylight = lighting === 'legacy' && !baselineDist ? 'baseline' : 'natural';
      const variant = compareDaylight ? `daylight=${daylight}` :
        compareSurfaces ? `surface=${lighting}&daylight=baseline` : `lighting=${lighting}&daylight=baseline`;
      const origin = previous && lighting === 'legacy' ? `http://127.0.0.1:${previous.httpServer.address().port}/sakura/` : site;
      await page.goto(`${origin}?scene=${scene}&${variant}&trace-lighting`);
      await page.locator(`#explorer[data-state="ready"][data-scene="${scene}"]`).waitFor({ timeout: 90_000 });
      const selected = page.locator(`[data-view="${view}"]`);
      if (await selected.getAttribute('aria-pressed') !== 'true') await selected.click();
      const explorer = page.locator('#explorer');
      assert.equal(await explorer.getAttribute('data-lighting'),
        !compareDaylight && !compareSurfaces && lighting === 'legacy' ? 'legacy' : 'hdr-post');
      if (compareDaylight) {
        assert.equal(await explorer.getAttribute('data-daylight'), daylight);
      } else if (compareSurfaces) {
        assert.equal(await explorer.getAttribute('data-surface'), lighting === 'legacy' ? 'legacy' : 'physical');
      }
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
    console.log(`${name}: fixed camera verified, ${compareDaylight ? 'daylight' : compareSurfaces ? 'physical surfaces' : 'HDR+ACES'} comparison captured`);
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(destination, 'camera-poses.json'), JSON.stringify(evidence, null, 2) + '\n');
} finally {
  await browser?.close();
  await Promise.all([server, previous].filter(Boolean).map(instance =>
    new Promise((resolve, reject) => instance.httpServer.close(error => error ? reject(error) : resolve()))));
}
