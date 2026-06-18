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
      // Rampa (HF-81): no Vitest 4 o `include` reporta, por padrão, apenas arquivos
      // exercitados por testes. A cobertura real de src/services e src/utils entra
      // na HF-76; o gate global 80% na HF-80.
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/vite-env.d.ts',
        'src/main.tsx',
        // Mapa fino de endpoints, sem teste dedicado ainda — cobertura entra na HF-76.
        // O smoke do App o importa transitivamente; excluí-lo mantém o gate per-file
        // 90% honesto (aplica-se só a arquivos com teste real, ex.: api.ts).
        'src/services/financeService.ts',
      ],
      // NÃO usar passWithNoTests. Thresholds per-file 90% nas camadas puras.
      thresholds: {
        perFile: true,
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
