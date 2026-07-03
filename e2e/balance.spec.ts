import { expect, test } from '@playwright/test';
import { CATEGORIES, ok, USERS } from './stubs';

// Fluxo crítico (HF-80): visão de saldo/orçamento no Dashboard.
// O hf-income-service (porta 8081) responde /balance com valores string —
// a UI só exibe o que o backend calcula (SAL-04/05).

const rawBalance = (overrides: Partial<Record<string, string | boolean>> = {}) => ({
  user_id: 'u1',
  competence: '2026-07',
  total_income: '5000.00',
  total_personal: '800.00',
  total_shared: '400.00',
  total_expenses: '1200.00',
  balance_today: '4300.00',
  committed_bills: '500.00',
  projected_balance: '3800.00',
  is_projected_negative: false,
  ...overrides,
});

const stubDashboard = async (
  page: import('@playwright/test').Page,
  balance: ReturnType<typeof rawBalance>,
) => {
  await page.route('**/api/v1/**', (route) => route.fulfill(ok([])));
  await page.route('**/api/v1/users', (route) => route.fulfill(ok(USERS)));
  await page.route('**/api/v1/categories', (route) => route.fulfill(ok(CATEGORIES)));
  // Mesmo padrão cobre a lista (/expenses/user/{id}) e os totais (/…/totals).
  await page.route('**/api/v1/expenses/user/**', (route) => {
    if (route.request().url().includes('/totals')) {
      return route.fulfill(ok({ total_personal: 800, total_shared: 400, total_general: 1200 }));
    }
    return route.fulfill(ok([]));
  });
  await page.route('**/api/v1/budgets/status**', (route) =>
    route.fulfill(
      ok([
        {
          id: 'b1',
          category_name: 'Alimentação',
          amount: 1000,
          current_spending: 350,
          alert_threshold: 80,
        },
      ]),
    ),
  );
  await page.route('**/api/v1/balance**', (route) => route.fulfill(ok(balance)));
};

test('Dashboard exibe saldo do mês e status de orçamento', async ({ page }) => {
  await stubDashboard(page, rawBalance());

  await page.goto('/');

  // Cards de saldo (SAL-04): valores vindos do backend, exibidos em pt-BR.
  await expect(page.getByRole('heading', { name: 'Saldo do Mês' })).toBeVisible();
  await expect(page.getByText('Saldo Hoje')).toBeVisible();
  await expect(page.getByText(/4\.300,00/)).toBeVisible();
  await expect(page.getByText('Saldo Projetado')).toBeVisible();
  await expect(page.getByText(/3\.800,00/)).toBeVisible();

  // Visão familiar consolidada (HF-23).
  await expect(page.getByRole('heading', { name: 'Visão Familiar' })).toBeVisible();

  // Status de orçamento com gasto corrente / limite.
  await expect(page.getByText('Budget Status')).toBeVisible();
  await expect(page.getByText(/350,00/).first()).toBeVisible();
  await expect(page.getByText(/1\.000,00/).first()).toBeVisible();
});

test('saldo projetado negativo exibe alerta visual (SAL-05)', async ({ page }) => {
  await stubDashboard(
    page,
    rawBalance({
      balance_today: '200.00',
      committed_bills: '700.00',
      projected_balance: '-500.00',
      is_projected_negative: true,
    }),
  );

  await page.goto('/');

  await expect(page.getByText('Saldo Projetado')).toBeVisible();
  // Valor NEGATIVO formatado em pt-BR — o sinal faz parte da asserção.
  await expect(page.getByText(/-\s?R\$\s?500,00/).first()).toBeVisible();
  await expect(page.getByLabel('Saldo projetado negativo')).toBeVisible();
});
