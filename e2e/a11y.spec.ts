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

// Gate estrito de a11y (HF-82 home; HF-84 app-wide): nenhuma das rotas principais
// pode ter violação WCAG 2 A/AA. Sem baseline.
const ROUTES = ['/', '/expenses', '/accounts-payable', '/budgets', '/settings'];

for (const path of ROUTES) {
  test(`rota ${path} não tem violações de acessibilidade (WCAG A/AA)`, async ({ page }) => {
    await page.goto(path);
    // A Sidebar (h1 "Home Finance") é comum a todas as rotas — espera o app montar.
    await page.getByRole('heading', { name: 'Home Finance' }).waitFor();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
