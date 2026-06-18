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

// Baseline de a11y da home (HF-81): o axe está cablado no Playwright, mas a home
// tem dívida de acessibilidade pré-existente. Estas regras ficam como baseline
// CONHECIDO e não bloqueiam o CI; a correção é o follow-up HF-82.
// Qualquer violação NOVA (fora do baseline) falha o teste — guarda de regressão.
const KNOWN_BASELINE_RULES = ['color-contrast', 'select-name'];

test('home não introduz novas violações de acessibilidade (WCAG A/AA)', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('heading', { name: 'Home Finance' }).waitFor();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const newViolations = results.violations.filter(
    (v) => !KNOWN_BASELINE_RULES.includes(v.id),
  );

  // Diagnóstico do baseline conhecido (não falha o teste).
  const baselineHit = results.violations
    .filter((v) => KNOWN_BASELINE_RULES.includes(v.id))
    .map((v) => v.id);
  if (baselineHit.length > 0) {
    console.warn(`a11y baseline conhecido (follow-up): ${baselineHit.join(', ')}`);
  }

  expect(newViolations).toEqual([]);
});
