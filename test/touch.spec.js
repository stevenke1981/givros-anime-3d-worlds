import { expect, test } from '@playwright/test';

test.describe('touch viewport', () => {
  test('exposes walking controls and keeps navigation usable', async ({ page }, info) => {
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    await page.addInitScript(() => {
      const getExtension = WebGL2RenderingContext.prototype.getExtension;
      WebGL2RenderingContext.prototype.getExtension = function (name) {
        return name === 'EXT_color_buffer_float' ? null : getExtension.call(this, name);
      };
    });
    await page.goto('./?trace-walk');
    const explorer = page.locator('#explorer');
    await expect(explorer).toHaveAttribute('data-state', 'ready', { timeout: 45_000 });
    const allViewsFit = await page.locator('.views').evaluate((nav) => nav.scrollWidth <= nav.clientWidth);
    expect(allViewsFit).toBe(true);
    await page.screenshot({ path: info.outputPath('mobile.png') });
    async function walkOnTouch() {
      await page.getByRole('button', { name: '開始散步' }).tap();
      const forward = page.getByRole('button', { name: '向前' });
      await expect(forward).toBeVisible();
      const canvas = page.locator('#world');
      await expect(canvas).toHaveAttribute('data-walk-position', /^-?\d+\.\d+,-?\d+\.\d+,-?\d+\.\d+$/);
      const origin = await canvas.getAttribute('data-walk-position');
      const bounds = await forward.boundingBox();
      const touch = await page.context().newCDPSession(page);
      await touch.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }],
      });
      try {
        await expect(canvas).not.toHaveAttribute('data-walk-position', origin, { timeout: 20_000 });
      } finally {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await touch.detach();
      }
      await page.getByRole('button', { name: '回全景' }).tap();
      await expect(explorer).toHaveAttribute('data-mode', 'scenic');
    }
    await walkOnTouch();
    await page.getByRole('button', { name: '場景選單' }).tap();
    const sceneMenu = page.getByRole('dialog', { name: '選擇場景' });
    await expect(sceneMenu.locator('[data-scene-choice]')).toHaveCount(10);
    await sceneMenu.locator('[data-scene-choice="04"]').tap();
    await expect(explorer).toHaveAttribute('data-scene', '04', { timeout: 70_000 });
    await expect(explorer).toHaveAttribute('data-lighting', 'aces-direct');
    await expect(explorer).toHaveAttribute('data-daylight', 'natural');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('水田梯田農村');
    await page.screenshot({ path: info.outputPath('mobile-terraces.png') });
    await walkOnTouch();
    expect(errors).toEqual([]);
  });
});
