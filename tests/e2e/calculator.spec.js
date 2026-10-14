const { test, expect } = require('@playwright/test');

const press = async (page, keys) => {
  for (const k of keys) await page.getByRole('button', { name: k, exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('5 + 3 = muestra 8 (backend real)', async ({ page }) => {
  await press(page, ['5', '+', '3', '=']);
  await expect(page.locator('#result')).toHaveText('8');
});

test('expresión con precedencia de operadores', async ({ page }) => {
  await press(page, ['2', '+', '3', '*', '4', '=']);
  await expect(page.locator('#result')).toHaveText('14');
});

test('división por cero muestra error del backend y C reinicia', async ({ page }) => {
  await press(page, ['1', '/', '0', '=']);
  await expect(page.locator('#result')).toHaveClass(/error/);
  await press(page, ['C']);
  await expect(page.locator('#result')).toHaveText('0');
  await expect(page.locator('#result')).not.toHaveClass(/error/);
});

test('respuesta de error simulada del backend', async ({ page }) => {
  await page.route('**/api/calculate', (route) =>
    route.fulfill({ status: 400, json: { error: 'Sintaxis inválida' } }));
  await press(page, ['1', '+', '1', '=']);
  await expect(page.locator('#result')).toHaveText('Sintaxis inválida');
});

test('error de comunicación con el backend', async ({ page }) => {
  await page.route('**/api/calculate', (route) => route.abort());
  await press(page, ['1', '+', '1', '=']);
  await expect(page.locator('#result')).toHaveText('No se pudo conectar con el servidor');
});

test('respuesta no JSON del backend', async ({ page }) => {
  await page.route('**/api/calculate', (route) =>
    route.fulfill({ status: 200, contentType: 'text/plain', body: 'oops' }));
  await press(page, ['1', '+', '1', '=']);
  await expect(page.locator('#result')).toHaveClass(/error/);
});
