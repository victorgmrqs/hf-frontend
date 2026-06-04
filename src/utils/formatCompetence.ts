export function formatCompetence(yyyyMM: string): string {
  const [year, month] = yyyyMM.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  const monthName = date.toLocaleDateString('pt-BR', { month: 'long' });
  return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${year}`;
}
