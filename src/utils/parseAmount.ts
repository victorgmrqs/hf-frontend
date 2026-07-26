/**
 * Converte um valor monetário digitado em pt-BR para number.
 * Com vírgula decimal, pontos são separadores de milhar: "1.200,00" → 1200.
 * Sem vírgula, o ponto é tratado como decimal ("620.50" → 620.5), preservando
 * o comportamento dos inputs existentes.
 */
export function parseAmountBR(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return NaN;
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed;
  return parseFloat(normalized);
}
