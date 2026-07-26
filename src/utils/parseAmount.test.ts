import { describe, expect, it } from 'vitest';
import { parseAmountBR } from './parseAmount';

describe('parseAmountBR', () => {
  it('converte decimal com vírgula', () => {
    expect(parseAmountBR('620,50')).toBe(620.5);
  });

  it('remove separador de milhar quando há vírgula decimal', () => {
    expect(parseAmountBR('1.200,00')).toBe(1200);
    expect(parseAmountBR('12.345.678,90')).toBe(12345678.9);
  });

  it('sem vírgula, ponto é decimal (comportamento dos inputs existentes)', () => {
    expect(parseAmountBR('620.50')).toBe(620.5);
    expect(parseAmountBR('1200')).toBe(1200);
  });

  it('entrada vazia ou inválida vira NaN', () => {
    expect(parseAmountBR('')).toBeNaN();
    expect(parseAmountBR('   ')).toBeNaN();
    expect(parseAmountBR('abc')).toBeNaN();
  });
});
