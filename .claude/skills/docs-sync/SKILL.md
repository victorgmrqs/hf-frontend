---
name: docs-sync
description: >
  Sincroniza a documentação com as mudanças de código do branch atual
  (hf-frontend): aplica a tabela "mudou X → atualiza doc Y" (CHANGELOG,
  evidência, testing-strategy) e registra divergências de contrato com o
  backend como pendência no ticket. Chamada pela Fase 5 do /task ou avulsa
  após mudanças manuais. Uso: /docs-sync [TICKET-ID]
---

# Skill: /docs-sync (hf-frontend)

## Objetivo

Garantir a invariante do projeto: **código alterado = documentação alterada no mesmo branch**. Esta skill aplica as atualizações; a verificação (gate) é do `/code-review-task` + `docs-guard.sh` no CI.

## Etapa 1 — Detectar o que mudou

```bash
git diff development...HEAD --name-only        # ou git diff development --name-only + untracked (pré-commit)
git diff development...HEAD -- package.json     # detectar mudança de dependências
```

## Etapa 2 — Tabela de sincronização (aplicar TODAS as linhas que casarem)

| Se o diff toca... | Atualizar |
|--------------------|-----------|
| Qualquer coisa em `src/` | `CHANGELOG.md` → entrada em `[Unreleased]` na seção certa (Added/Changed/Fixed), sufixo `(HF-XX)` |
| `package.json` (deps) | `CHANGELOG.md` → seção **Dependencies** com `pacote: x.y.z → a.b.c` |
| Tela nova/alterada | Evidência screenshot/GIF referenciada no PR (anexar no body, não versionar binário pesado) |
| Nova convenção de teste / ferramenta de teste | `docs/testing-strategy.md` |
| Nova rota/estrutura de pastas relevante | `CLAUDE.md` (seção Architecture) |
| Uso de endpoint que **não existe** no `openapi.yaml` | **não** edite o openapi local — registre pendência de contrato no comentário do ticket (Etapa 3) |

Regras de escrita:
- Atualize **apenas** o que o diff justifica — sem reescrever seções intactas.
- Datas absolutas (YYYY-MM-DD); IDs de ticket (`HF-XX`) e de regra/erro sempre referenciados.

## Etapa 3 — Divergências de contrato com o backend

O contrato REST é propriedade dos backends (hf-transaction-service / hf-income-service). Se a task revelou que o `openapi.yaml` local está desatualizado ou que um endpoint/erro diverge do real:
1. **Não** corrija o contrato do backend a partir daqui.
2. Registre a divergência (endpoint, shape esperado vs recebido, `error.code`) como **comentário no ticket Jira** e marque para o backend responsável.

## Etapa 4 — Relatório

Apresente o que foi atualizado e o que ficou pendente (ex.: pendências de contrato para o backend), para a Fase 5 do `/task` decidir os próximos passos.
