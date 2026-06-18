import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import App from './App';
import { server } from './test/msw/server';

// Smoke da fundação (HF-81): a aplicação monta e renderiza a navegação base.
// Não testa regra de negócio — isso vem nas tasks de feature (HF-76+).
describe('App (smoke)', () => {
  it('monta e renderiza a navegação sem lançar', async () => {
    // Catch-all permissivo: o smoke não acopla a endpoints específicos de tela.
    server.use(
      http.get('*', () => HttpResponse.json({ data: [], error: null })),
    );

    render(<App />);

    expect(
      await screen.findByRole('heading', { name: 'Home Finance' }),
    ).toBeInTheDocument();
  });
});
