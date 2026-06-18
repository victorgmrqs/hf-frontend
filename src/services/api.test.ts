import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiFetch } from './api';
import { server } from '../test/msw/server';

// Cliente HTTP base: prioridade da fundação (testing-strategy §Setup #8).
// Valida o desempacotamento do envelope padrão { data, error } e o caminho de rede.
describe('apiFetch', () => {
  it('retorna data e error:null em resposta de sucesso', async () => {
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({ data: [{ id: '1' }], error: null }),
      ),
    );

    const { data, error } = await apiFetch<{ id: string }[]>('/users');

    expect(error).toBeNull();
    expect(data).toEqual([{ id: '1' }]);
  });

  it('propaga o objeto error do envelope em resposta não-ok', async () => {
    server.use(
      http.get('*/users', () =>
        HttpResponse.json(
          { data: null, error: { code: 'USR-404', message: 'não encontrado' } },
          { status: 404 },
        ),
      ),
    );

    const { data, error } = await apiFetch('/users');

    expect(data).toBeNull();
    expect(error).toEqual({ code: 'USR-404', message: 'não encontrado' });
  });

  it("usa 'Unknown error' quando a resposta não-ok não traz error", async () => {
    server.use(
      http.get('*/users', () =>
        HttpResponse.json({ data: null }, { status: 500 }),
      ),
    );

    const { data, error } = await apiFetch('/users');

    expect(data).toBeNull();
    expect(error).toBe('Unknown error');
  });

  it('captura falha de rede e devolve o erro', async () => {
    server.use(http.get('*/users', () => HttpResponse.error()));

    const { data, error } = await apiFetch('/users');

    expect(data).toBeNull();
    expect(error).toBeInstanceOf(Error);
  });
});
