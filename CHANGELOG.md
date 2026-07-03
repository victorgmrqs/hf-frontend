# Changelog

Todas as mudanças notáveis deste projeto são documentadas aqui.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/);
versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Added

- (HF-80) E2E dos fluxos críticos e gate global de cobertura 80% ativo — fim da rampa de
  testes (HF-75). Novos specs Playwright com backend stubado por endpoint:
  `e2e/expense.spec.ts` (criar despesa compartilhada, validar payload SHARED +
  `shared_user_ids`, bloqueio com <2 participantes) e `e2e/balance.spec.ts` (cards de
  Saldo do Mês, status de orçamento e alerta de saldo projetado negativo — SAL-05).
  Backfill dirigido de testes de comportamento (ExpenseModal, PaymentMethodModal,
  Dashboard, Sidebar, Settings) para sustentar o gate. `vitest.config.ts` agora falha
  abaixo de 80% global (lines/branches/functions/statements), mantendo 90% em
  `src/services` e `src/utils` (agora agregado por pasta — a flag `perFile` do Vitest é
  única para todos os grupos e conflitaria com o gate global). E2E de autenticação
  (login + refresh) NÃO entrou: o
  cliente ainda não tem tela de login/JWT — pendência registrada no ticket.

- (HF-87) Mapeador central de erro `src/utils/errorMessage.ts` (`messageForError(error, fallback?)`):
  traduz `error.code` do envelope dos dois backends (income + transaction) para mensagens
  pt-BR, com narrowing seguro de `unknown`, fallback contextual e garantia de nunca expor
  `message`/`trace_id`/stack do backend. Removidas as cópias locais e duplicadas de
  `messageForError` (`useBalance`, `useFamilyTotals`, `IncomeModal`) e adotado o mapeador
  nas páginas/componentes/contexto que antes usavam toast genérico (Dashboard, Income,
  Expenses, Settings, AccountsPayable, Budgets, BudgetsContext, Expense/Budget/Category/
  EditCategory/PaymentMethod/PayAccount/AccountPayable modais), preservando o texto atual
  como fallback. Pendência registrada para o backend: typo `INTERNAL_SEVER_ERROR`
  (mapeado defensivamente junto de `INTERNAL_SERVER_ERROR`).

- (HF-42) Cards "Saldo Hoje" e "Saldo Projetado" no Dashboard (SAL-04/05): consomem
  `GET hf-income-service/balance` via novo método `incomeService.getBalance` (converte
  os valores monetários string do envelope em number) e o hook `useBalance` (estados
  loading/erro, mapeamento de `error.code` MISSING_REQUIRED_FIELD/INVALID_COMPETENCE/
  UPSTREAM_TIMEOUT/UPSTREAM_ERROR → pt-BR). Novo componente `BalanceCards` com skeleton
  de carregamento, tooltip explicando a diferença entre os saldos e alerta visual
  (borda + texto vermelho + ícone) quando `is_projected_negative` (SAL-05). Cálculo é
  do backend — o frontend só exibe.
- (HF-23) Seção "Visão Familiar" no Dashboard: cards lado a lado com os totais
  (pessoal, compartilhado e geral) de cada membro da família + card "Total Família"
  com a soma dos gastos totais. Novo hook `useFamilyTotals` (busca paralela de
  `GET /expenses/user/{id}/totals` por usuário, com estados loading/erro/vazio e
  mapeamento de `error.code` VALIDATION_ERROR/INTERNAL_ERROR → pt-BR) e componente
  `FamilyVisionSection`. Seção sempre visível; estado informativo quando há menos
  de 2 usuários.

### Tests

- (HF-79) Backfill de testes de integração das 5 páginas (Dashboard, Expenses, Budgets,
  AccountsPayable, Settings) com MSW + react-router via harness `renderWithProviders`
  (`src/test/renderWithProviders.tsx`) e handlers padrão (`src/test/msw/pageHandlers.ts`):
  carregamento, dados, vazio, erro de envelope e fluxos (delete/filtro/paginação/copiar/
  pagar/abrir modais). `src/pages` agregado em 80%. Sem mudança de produção.
- (HF-78) Backfill de testes dos componentes (8 sem cobertura): EmptyState, ConfirmDeleteModal,
  Category/EditCategory/Expense/AccountPayable/PayAccount/PaymentMethod modais. RTL + user-event,
  queries por role/text, MSW; cobrem caminho feliz, erro de envelope (toast/banner) e validação
  inline. `sonner` e `useUser` mockados. `src/components` agregado em 82.8% (≥80%). Sem produção.
- (HF-77) Backfill de testes dos hooks (`useUser`, `useCompetence`) via `renderHook` + MSW:
  carregamento/seleção de usuário, restauração do `localStorage` e fallbacks, persistência,
  estado de erro (envelope), e default/populamento/refresh de competências. Cobertura
  `useUser` 97% e `useCompetence` 94% (linha não coberta = `catch` defensivo inalcançável).
- (HF-76) Backfill de testes da camada de maior risco: `financeService.ts` (contrato de
  método/URL/query/body, propagação de `error.code`, `getAvailableCompetences`) e
  `formatCompetence.ts`. `financeService.ts` reincluído no coverage (exclusão da rampa da
  HF-81 removida). Per-file de `src/services` e `src/utils` em 100% de linhas.
  Cenários de refresh de token e mapeamento `error.code`→pt-BR descopados (não há código
  ainda) → follow-ups HF-86 (auth/refresh) e HF-87 (mapeador pt-BR).

### Fixed

- (HF-85) Acessibilidade de modais/formulários: selects de `ExpenseModal` (Paid by,
  Category, Payment Method), `AccountPayableModal` (Recurrence), `PayAccountModal`
  (Payment Method, Category) e `EditCategoryModal` agora têm nome acessível (label
  associado via `htmlFor`/`id`); estado de hover em `Expenses.tsx` passou a usar
  `bg-primary-strong` (texto branco ≥ AA). Testes de componente validam o nome
  acessível de cada select (`getByRole('combobox', { name })`).

- (HF-84) Acessibilidade AA app-wide: tokens `--color-primary-text`/`--color-primary-strong`
  aplicados em Expenses, Budgets, AccountsPayable e Settings (+ botões dos modais e do
  `EmptyState`); `aria-label` nos selects de filtro das páginas (competência, tipo,
  categoria, status, projeção). Gate axe estendido para 5 rotas (`/`, `/expenses`,
  `/accounts-payable`, `/budgets`, `/settings`) exigindo `violations === []`.

- (HF-82) Acessibilidade da home (WCAG 2 A/AA): `<select>` de competência com
  `aria-label`; contraste corrigido via tokens `--color-primary-text` (#5aa9ff, texto
  sobre fundo escuro) e `--color-primary-strong` (#0b6bd6, fundo de botão com texto branco)
  no Dashboard e na Sidebar; `text-emerald-500/80` → `text-emerald-500`. Baseline de a11y
  removido em `e2e/a11y.spec.ts` — o gate agora exige `violations === []` na home.
  `scripts/docs-guard.sh` passa a aceitar também testes e2e (`*.spec.ts[x]`) como teste no diff.

### Added

- (HF-40) Formulário de criação e edição de receita (`IncomeModal`): campos descrição, valor,
  tipo, data e toggle "Repetir todo mês"; validação inline (valor>0, descrição); na edição,
  tipo/data são read-only e exibe-se o aviso "vale a partir deste mês" para recorrentes;
  `incomeService.createIncome`/`updateIncome`; mapeamento dos `error.code` REC→pt-BR
  (`INVALID_AMOUNT`, `MISSING_REQUIRED_FIELD`, `CANNOT_EDIT_PROPAGATED_INCOME`…). Na página,
  o botão editar fica desabilitado em receitas propagadas (`origin_id`). Mapa de erro inline
  até a centralização (HF-87).
- (HF-39) Página de gerenciamento de receitas (rota `/income` + item "Receitas" na Sidebar):
  listagem por competência (descrição/valor/tipo/data + badge "Recorrente"), total do mês,
  empty state e exclusão (com confirmação + toast). Novo cliente do **hf-income-service**
  (`incomeService` + `config.incomeApi.baseUrl`/`VITE_INCOME_API_URL`; `apiFetch` ganhou
  `baseUrl` opcional, reusando o envelope). O modal de criação/edição é a HF-40.
  Runtime depende do hf-income-service (em desenvolvimento); até subir, degrada para erro/vazio.
- (HF-22) Gráfico (donut) de gastos por categoria no Dashboard: seção "Gastos por Categoria"
  com donut SVG próprio (sem dependência nova), legenda (nome/valor/percentual) e detalhe no
  hover (centro + `<title>`); estados loading/vazio. Consome `GET /expenses/totals/by-category`
  (HF-29) via cliente tipado; geometria/parse isolados em `src/utils/donut.ts`. Mirror do
  `openapi.yaml` atualizado com o endpoint. Runtime depende da HF-29 (In Review).
- (HF-12) [MET-03] Alerta de orçamento configurável por percentual: campo "Alerta em (%)"
  (padrão 80, 1–100) no modal de orçamento, com criação e edição; cor do badge/barra do
  card passa a usar o `alert_threshold` de cada orçamento (amarelo no limiar, vermelho ≥100%);
  contador de orçamentos em alerta no item Budgets da Sidebar (segue a competência selecionada
  via `BudgetsContext`). Regra de cor isolada em `src/utils/budgetAlert.ts`.

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
