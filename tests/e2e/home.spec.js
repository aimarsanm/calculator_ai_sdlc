const { test, expect } = require('@playwright/test');

test('home navega a la calculadora y vuelve', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#nav-calculator')).toBeVisible();
  await expect(page.locator('#nav-flappy')).toBeVisible();
  await page.locator('#nav-calculator').click();
  await expect(page.locator('.calculator')).toBeVisible();
  await page.getByRole('link', { name: /Volver al inicio/ }).first().click();
  await expect(page.locator('#nav-calculator')).toBeVisible();
});

test('home navega a Flappy Bird y vuelve', async ({ page }) => {
  await page.goto('/');
  await page.locator('#nav-flappy').click();
  await expect(page.locator('#flappy-canvas')).toBeVisible();
  await page.locator('[data-view="flappy"] .back').click();
  await expect(page.locator('#nav-flappy')).toBeVisible();
});
