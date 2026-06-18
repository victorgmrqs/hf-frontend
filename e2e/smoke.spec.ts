import { expect, test } from '@playwright/test';

// Stub do backend: a fundação não depende de uma API real rodando.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], error: null }),
    }),
  );
});

test('home carrega e renderiza a navegação base', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Home Finance' }),
  ).toBeVisible();
});
