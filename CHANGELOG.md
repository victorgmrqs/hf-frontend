# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- (HF-81) Fundação de testes: Vitest (jsdom) + Testing Library, coverage v8 com
  thresholds per-file 90% em `src/services` e `src/utils` (rampa — mede apenas
  arquivos exercitados; cobertura real chega na HF-76, gate global 80% na HF-80).
- (HF-81) MSW (`src/test/msw/`) com helpers do envelope padrão `{ data, error }`.
- (HF-81) Playwright (`e2e/`) com smoke da home e checagem de acessibilidade (axe, WCAG A/AA).
- (HF-81) Scripts `typecheck`, `test`, `test:watch`, `test:coverage` e `e2e`.
- (HF-81) `scripts/docs-guard.sh`: falha o PR se `src/` muda sem `CHANGELOG.md` e sem teste no diff.
- (HF-81) Steps de CI (`ci-cd.yml`): typecheck, test:coverage, e2e e docs-guard.

### Changed

- (HF-81) Tipos `Category.description?` e `PaymentMethod.users?` alinhados ao contrato
  do backend (`openapi.yaml`) — correção apenas de tipos exigida pelo `typecheck`,
  sem mudança de comportamento (campos já eram lidos de forma opcional pelos modais).

### Notes

- (HF-81) A11y da home tem dívida pré-existente (`select-name`, `color-contrast`)
  registrada como baseline não-bloqueante em `e2e/a11y.spec.ts`; correção em HF-82.

### Dependencies

- (HF-81) devDeps adicionadas: `vitest 4.1`, `@vitest/coverage-v8 4.1`,
  `@testing-library/react 16`, `@testing-library/dom 10`, `@testing-library/jest-dom 6`,
  `@testing-library/user-event 14`, `jsdom 29`, `msw 2`, `@playwright/test 1.61`,
  `@axe-core/playwright 4.11`, `vitest-axe 0.1`.
