// Massa e helpers compartilhados dos E2E. O backend é sempre stubado via
// page.route — os specs validam o fluxo da UI contra o envelope { data, error }.

export const USERS = [
  { id: 'u1', name: 'Victor', email: 'victor@example.com' },
  { id: 'u2', name: 'Ana', email: 'ana@example.com' },
];

export const CATEGORIES = [
  { id: 'c1', name: 'Alimentação', color: '#22c55e' },
];

export const PAYMENT_METHODS = [
  { id: 'pm1', name: 'Cartão Pessoal', type: 'CREDIT_CARD', shared: false },
];

/** Corpo de resposta no envelope padrão dos backends. */
export const ok = (data: unknown) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ data, error: null }),
});
