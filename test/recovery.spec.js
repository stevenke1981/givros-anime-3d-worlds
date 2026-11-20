import { expect, test } from '@playwright/test';

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
