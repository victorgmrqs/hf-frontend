# hf-frontend

Web frontend for **Home Finance** — a household finance manager for a couple with kids: personal and shared expenses (with automatic splitting), payment methods, categories, income, monthly budget, balance and reduction goals.

The UI is in **pt-BR** and consumes two Go backends over REST:

| Backend | Domain |
| --- | --- |
| `hf-transaction-service` | expenses, payment methods, categories (`DSP`, `FPG`, `CAT`, `USR`, `PER`) |
| `hf-income-service` | income, global budget, balance, reduction goals (`REC`, `ORC`, `SAL`, `MET`) |

> **The backend owns the business rules.** Validation here is a UX courtesy — never duplicate or reimplement a rule in the frontend. The REST contract lives in [`openapi.yaml`](openapi.yaml) / [`OPENAPI.md`](OPENAPI.md); business rules are catalogued in [`RULES.md`](RULES.md).

## Tech stack

- **Vite 5 + React 18 + TypeScript** (strict, no unjustified `any`)
- **react-router-dom 6** for routing
- **Tailwind CSS 4** + **Bootstrap 5** for styling, **lucide-react** for icons, **sonner** for toasts
- Typed REST client derived from the OpenAPI contract; Bearer JWT auth (access + refresh) with automatic refresh in the client
- **Vitest** + Testing Library + MSW (unit/integration), **Playwright** + axe (e2e/a11y), ESLint

## Getting started

Requires Node 22+ (matching the Docker build image).

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

### Environment variables

Only `VITE_*` variables are public — they are inlined into the bundle. Never put secrets there.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api/v1` | base URL of `hf-transaction-service` |
| `VITE_INCOME_API_URL` | `http://localhost:8081/api/v1` | base URL of `hf-income-service` |
| `VITE_DEFAULT_USER_ID` | — | optional default user for local development |

## Scripts

```bash
npm run dev            # Vite dev server
npm run build          # tsc && vite build — must pass before opening a PR
npm run preview        # serve the production build locally
npm run lint           # eslint . --max-warnings 10
npm run typecheck      # tsc -b --noEmit
npm run test           # Vitest (single run)
npm run test:watch     # Vitest in watch mode
npm run test:coverage  # Vitest + v8 coverage (per-file gate of 90% in src/services and src/utils)
npm run e2e            # Playwright (smoke + axe a11y on the home page)
```

See [docs/testing-strategy.md](docs/testing-strategy.md) for what to test at which layer.

## Project layout

```
src/
  pages/        screens by route (Dashboard, Expenses, AccountsPayable, Budgets, Income, Settings)
  components/   reusable components (modals, cards, charts, sidebar)
  contexts/     React contexts (BudgetsContext)
  hooks/        reusable state logic (useUser, useBalance, useCompetence, useGlobalBudget, useFamilyTotals)
  services/     typed API client (api, financeService, incomeService)
  config/       configuration (base URLs from VITE_* vars)
  utils/        pure functions (parsing, formatting, split, error mapping)
  styles/ · assets/
e2e/            Playwright specs
docs/           testing strategy, design briefing, research notes
```

Every API call goes through `src/services/` — never a bare `fetch` inside a component. Tests live next to the file they cover (`Foo.tsx` → `Foo.test.tsx`).

### Routes

| Path | Screen |
| --- | --- |
| `/` | Dashboard |
| `/expenses` | Expenses |
| `/accounts-payable` | Accounts payable |
| `/budgets` | Budgets and reduction goals |
| `/income` | Income |
| `/settings` | Categories, payment methods, settings |

## Non-negotiable constraints

- No business rules in the frontend — the backend is the authority.
- Tokens and secrets never reach logs or the console.
- Every screen that consumes the API has explicit **loading**, **error** and **empty** states.
- API errors: map `error.code` from the standard envelope to pt-BR messages; never show a raw stack or `trace_id` to the user.
- Responsive UI down to 360 px wide.

## Deployment

The [Dockerfile](Dockerfile) does a multi-stage build (Node 22 → build, nginx 1.25 alpine → serve) using [`nginx.conf`](nginx.conf) for SPA routing.

```bash
docker build -t hf-frontend .
docker run -p 8080:80 hf-frontend
```

CI/CD lives in [.github/workflows/ci-cd.yml](.github/workflows/ci-cd.yml).

## Contributing

- Branches: `main` ← `development` ← `feat/HF-XX-*`. Canonical workflow: `../hf-income-service/docs/workflow.md`.
- This repo implements Jira tickets prefixed with `[frontend]`.
- Ticket evidence in the PR: **screenshot/GIF + reproduction steps**.
- Update [`CHANGELOG.md`](CHANGELOG.md) in every task (enforced by the docs-guard CI check).
- `npm run lint`, `npm run typecheck`, `npm run test` and `npm run build` must pass before the PR.

See [CLAUDE.md](CLAUDE.md) for the agent-facing version of these conventions.
