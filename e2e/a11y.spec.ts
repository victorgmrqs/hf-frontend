import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [], error: null }),
    }),
  );
});

// Gate estrito de a11y da home (HF-82): a dívida pré-existente (select-name +
// color-contrast) foi corrigida, então a home não pode ter NENHUMA violação
// WCAG 2 A/AA. Sem baseline.
test('home não tem violações de acessibilidade (WCAG A/AA)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Home Finance' }).waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
