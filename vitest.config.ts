import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Configuração de testes unit/component/integration (Vitest + Testing Library + MSW).
// E2E (Playwright) fica fora daqui — ver playwright.config.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    // Vitest não deve varrer a suíte e2e (Playwright tem seu próprio runner).
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      // No Vitest 4 o `include` reporta, por padrão, apenas arquivos exercitados
      // por testes. A rampa (HF-81 → HF-76..79 → HF-80) terminou: gate global 80%.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
      ],
      // NÃO usar passWithNoTests. Gate global 80% agregado (HF-80) + 90% agregado
      // nas camadas puras. A flag `perFile` do Vitest é única para todos os grupos
      // (não existe per-glob) — com o gate global ela precisaria valer 80% por
      // arquivo, o que não é o pedido; services/utils passam a 90% por pasta.
      // Arquivos casados pelos globs saem do cálculo do grupo global.
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
        'src/services/**': {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
        'src/utils/**': {
          lines: 90,
          branches: 90,
          functions: 90,
          statements: 90,
        },
      },
    },
  },
});
