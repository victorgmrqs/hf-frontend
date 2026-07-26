import { describe, expect, it } from 'vitest';
import { DEFAULT_ERROR_MESSAGE, ERROR_MESSAGES, messageForError } from './errorMessage';

describe('messageForError', () => {
  // Um teste nomeado por error.code mapeado (exigência da testing-strategy:
  // cada error.code do envelope tratado pela UI → 1 teste nomeado).
  it.each(Object.entries(ERROR_MESSAGES))(
    'mapeia o code "%s" para a mensagem pt-BR do catálogo',
    (code, expected) => {
      expect(messageForError({ code })).toBe(expected);
    },
  );

  it('usa o fallback contextual quando o code é desconhecido', () => {
    expect(messageForError({ code: 'SOMETHING_UNKNOWN' }, 'Erro ao carregar receitas')).toBe(
      'Erro ao carregar receitas',
    );
  });

  it('usa o fallback contextual quando o erro não tem code', () => {
    expect(messageForError({ message: 'boom' }, 'Erro ao carregar despesas')).toBe(
      'Erro ao carregar despesas',
    );
  });

  it('usa o fallback genérico padrão quando nenhum fallback é informado', () => {
    expect(messageForError({ code: 'UNKNOWN' })).toBe(DEFAULT_ERROR_MESSAGE);
    expect(messageForError(null)).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it('não quebra para entradas atípicas (null, undefined, string, number)', () => {
    expect(messageForError(null)).toBe(DEFAULT_ERROR_MESSAGE);
    expect(messageForError(undefined)).toBe(DEFAULT_ERROR_MESSAGE);
    expect(messageForError('erro em texto')).toBe(DEFAULT_ERROR_MESSAGE);
    expect(messageForError(42)).toBe(DEFAULT_ERROR_MESSAGE);
  });

  it('ignora code não-string (não lança e cai no fallback)', () => {
    expect(messageForError({ code: 123 }, 'fallback')).toBe('fallback');
    expect(messageForError({ code: null }, 'fallback')).toBe('fallback');
  });

  it('nunca expõe trace_id nem message crua do backend na saída', () => {
    const backendError = {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'panic: nil pointer at repository.go:42',
      trace_id: 'abc-123-secret-trace',
    };
    const out = messageForError(backendError);
    expect(out).toBe(ERROR_MESSAGES.INTERNAL_SERVER_ERROR);
    expect(out).not.toContain('trace');
    expect(out).not.toContain('abc-123-secret-trace');
    expect(out).not.toContain('repository.go');
  });

  it('mapeia o typo do backend INTERNAL_SEVER_ERROR para a mesma mensagem', () => {
    expect(messageForError({ code: 'INTERNAL_SEVER_ERROR' })).toBe(
      ERROR_MESSAGES.INTERNAL_SERVER_ERROR,
    );
  });

  it('mapeia os códigos MET (metas de redução — HF-47)', () => {
    expect(messageForError({ code: 'GOAL_ALREADY_EXISTS' })).toBe(
      'Já existe uma meta para esta categoria neste mês. Edite a meta atual.',
    );
    expect(messageForError({ code: 'GOAL_NOT_FOUND' })).toBe('Meta de redução não encontrada.');
    expect(messageForError({ code: 'INVALID_TARGET_AMOUNT' })).toBe(
      'A meta deve ser um valor maior que zero.',
    );
  });
});
