#!/usr/bin/env bash
# docs-guard (HF-81): falha o PR se o diff toca código de src/ sem atualizar
# CHANGELOG.md e sem incluir ao menos um teste (*.test.ts[x]) no mesmo diff.
# Base de comparação: BASE_REF (CI) ou origin/development → development.
set -euo pipefail

BASE_REF="${BASE_REF:-}"
if [ -z "$BASE_REF" ]; then
  if git rev-parse --verify --quiet origin/development >/dev/null; then
    BASE_REF="origin/development"
  else
    BASE_REF="development"
  fi
fi

MERGE_BASE="$(git merge-base "$BASE_REF" HEAD 2>/dev/null || echo "$BASE_REF")"
CHANGED="$(git diff --name-only "$MERGE_BASE"...HEAD)"

if [ -z "$CHANGED" ]; then
  echo "docs-guard: nenhum arquivo alterado vs $BASE_REF — ok."
  exit 0
fi

# Código de produção em src/ (exclui testes e helpers de teste).
SRC_PROD="$(echo "$CHANGED" | grep -E '^src/.*\.(ts|tsx)$' | grep -Ev '\.test\.(ts|tsx)$|^src/test/' || true)"

if [ -z "$SRC_PROD" ]; then
  echo "docs-guard: nenhuma mudança de código de produção em src/ — ok."
  exit 0
fi

HAS_CHANGELOG="$(echo "$CHANGED" | grep -E '^CHANGELOG\.md$' || true)"
# Teste no diff = unit/component (*.test.ts[x]) OU e2e (*.spec.ts[x], ex.: a11y).
HAS_TEST="$(echo "$CHANGED" | grep -E '\.(test|spec)\.(ts|tsx)$' || true)"

FAIL=0
if [ -z "$HAS_CHANGELOG" ]; then
  echo "docs-guard: ERRO — src/ mudou mas CHANGELOG.md não foi atualizado."
  FAIL=1
fi
if [ -z "$HAS_TEST" ]; then
  echo "docs-guard: ERRO — src/ mudou mas nenhum teste (*.test.ts[x] ou e2e *.spec.ts[x]) está no diff."
  FAIL=1
fi

if [ "$FAIL" -ne 0 ]; then
  echo ""
  echo "Arquivos de produção alterados em src/:"
  echo "$SRC_PROD" | sed 's/^/  - /'
  exit 1
fi

echo "docs-guard: src/ alterado com CHANGELOG.md + teste no diff — ok."
