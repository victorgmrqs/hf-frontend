import { describe, expect, it } from 'vitest';
import { formatCompetence } from './formatCompetence';

describe('formatCompetence', () => {
  it('formata competência em pt-BR com mês capitalizado', () => {
    expect(formatCompetence('2026-06')).toBe('Junho/2026');
    expect(formatCompetence('2026-01')).toBe('Janeiro/2026');
  });

  it('formata dezembro (último mês do ano) corretamente', () => {
    expect(formatCompetence('2025-12')).toBe('Dezembro/2025');
  });

  it('não lança para entrada malformada (retorna string)', () => {
    expect(typeof formatCompetence('')).toBe('string');
    expect(typeof formatCompetence('abc')).toBe('string');
  });
});
