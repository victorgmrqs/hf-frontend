import { expect, test } from '@playwright/test';
import { CATEGORIES, ok, PAYMENT_METHODS, USERS } from './stubs';

// Fluxo crítico (HF-80): criar despesa compartilhada e vê-la na lista.
// Backend stubado por endpoint; o POST capturado valida o payload que a UI monta
// (divisão é responsabilidade do backend — aqui só se verifica o contrato).

interface CreatedExpense {
  id: string;
  description: string;
  value: number;
  date: string;
  competence: string;
  type: string;
  user_id: string;
  payment_method: (typeof PAYMENT_METHODS)[number];
  shared_with: { user_id: string; name: string; divided_amount: number }[];
}

test('cria despesa compartilhada e ela aparece na lista', async ({ page }) => {
  const expenses: CreatedExpense[] = [];
  let createdPayload: Record<string, unknown> | undefined;

  // Catch-all primeiro (rotas registradas depois têm precedência no Playwright).
  await page.route('**/api/v1/**', (route) => route.fulfill(ok([])));
  await page.route('**/api/v1/users', (route) => route.fulfill(ok(USERS)));
  await page.route('**/api/v1/categories', (route) => route.fulfill(ok(CATEGORIES)));
  await page.route('**/api/v1/payment-methods/user/**', (route) =>
    route.fulfill(ok(PAYMENT_METHODS)),
  );
  await page.route('**/api/v1/expenses/user/**', (route) => route.fulfill(ok(expenses)));
  await page.route('**/api/v1/expenses', (route, request) => {
    if (request.method() !== 'POST') return route.fulfill(ok(expenses));
    createdPayload = request.postDataJSON() as Record<string, unknown>;
    const created: CreatedExpense = {
      id: 'e1',
      description: String(createdPayload.description),
      value: Number(createdPayload.amount),
      date: String(createdPayload.date),
      competence: String(createdPayload.competence),
      type: String(createdPayload.type),
      user_id: String(createdPayload.user_id),
      payment_method: PAYMENT_METHODS[0],
      shared_with: [
        { user_id: 'u1', name: 'Victor', divided_amount: 60.25 },
        { user_id: 'u2', name: 'Ana', divided_amount: 60.25 },
      ],
    };
    expenses.push(created);
    return route.fulfill(ok(created));
  });

  await page.goto('/expenses');
  await page.getByRole('button', { name: 'Add Expense' }).click();

  await page.getByPlaceholder('0,00').fill('120,50');
  await page.getByPlaceholder('e.g. Weekly Groceries').fill('Mercado da semana');

  // Toggle "Shared Expense?" — o input é sr-only, por isso force.
  await page.getByRole('checkbox').check({ force: true });
  // Ao compartilhar, os demais membros da família entram como participantes.
  await expect(page.getByRole('button', { name: 'Ana' })).toBeVisible();

  await page.getByRole('button', { name: 'Save Expense' }).click();

  await expect(page.getByText('Despesa criada com sucesso')).toBeVisible();

  // Contrato do POST /expenses: tipo SHARED e pagador incluído na divisão.
  expect(createdPayload).toMatchObject({
    description: 'Mercado da semana',
    amount: 120.5,
    type: 'SHARED',
    user_id: 'u1',
  });
  expect((createdPayload?.shared_user_ids as string[]).sort()).toEqual(['u1', 'u2']);

  // A lista recarrega e exibe a nova despesa.
  await expect(page.getByRole('cell', { name: /Mercado da semana/ })).toBeVisible();
  await expect(page.getByText(/120,50/)).toBeVisible();
  await expect(page.getByRole('cell', { name: 'SHARED', exact: true })).toBeVisible();
});

test('despesa compartilhada sem outro participante bloqueia o envio', async ({ page }) => {
  await page.route('**/api/v1/**', (route) => route.fulfill(ok([])));
  await page.route('**/api/v1/users', (route) => route.fulfill(ok(USERS)));
  await page.route('**/api/v1/categories', (route) => route.fulfill(ok(CATEGORIES)));
  await page.route('**/api/v1/payment-methods/user/**', (route) =>
    route.fulfill(ok(PAYMENT_METHODS)),
  );

  await page.goto('/expenses');
  await page.getByRole('button', { name: 'Add Expense' }).click();
  await page.getByRole('checkbox').check({ force: true });

  // Remove a participante sugerida — resta só o pagador.
  await page.getByRole('button', { name: 'Ana' }).click();

  await expect(
    page.getByText('Despesas compartilhadas precisam de pelo menos 2 participantes'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Expense' })).toBeDisabled();
});
