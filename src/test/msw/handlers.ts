import { http, HttpResponse } from 'msw';

/**
 * Envelope padrão do backend HF: `{ data, error }`.
 * - sucesso → `{ data, error: null }`
 * - falha   → `{ data: null, error: { code, message, trace_id } }`
 * Helpers reutilizados pelos testes de integração das próximas tasks (HF-76+).
 */
export interface ApiError {
  code: string;
  message: string;
  trace_id?: string;
}

export function ok<T>(data: T, init?: ResponseInit) {
  return HttpResponse.json({ data, error: null }, init);
}

export function fail(
  status: number,
  code: string,
  message: string,
  trace_id = 'test-trace-id',
) {
  return HttpResponse.json(
    { data: null, error: { code, message, trace_id } },
    { status },
  );
}

// Handlers base. As tasks de feature acrescentam handlers específicos por endpoint
// (server.use(...)) dentro de cada teste; aqui ficam apenas exemplos do contrato.
export const handlers = [
  http.get('*/health', () => ok({ status: 'ok' })),
];
