---
name: backfill-tests
description: >
  Escreve testes para código JÁ EXISTENTE e sem cobertura no hf-frontend,
  seguindo docs/testing-strategy.md. Recebe uma área (services | utils | hooks |
  components | pages) ou um ticket; mapeia comportamento/branches/error.code não
  testados, escolhe a camada certa, escreve testes significativos (sem
  anti-padrões), roda coverage e reporta o delta. Pré-requisito: fundação de
  testes instalada. Uso: /backfill-tests <área|TICKET-ID>   ex: /backfill-tests services
---

# Skill: /backfill-tests (hf-frontend)

## Objetivo

Cobrir com testes o código existente que nasceu sem testes, **por camada**, sem mudar comportamento. Diferente do `/task` (feature nova a partir de ticket): aqui o código já existe e o trabalho é caracterizá-lo com testes que travam regressão. Estratégia e metas: [../../../docs/testing-strategy.md](../../../docs/testing-strategy.md).

> **Pré-requisito:** o tooling de testes (Vitest+coverage, MSW, Playwright) precisa existir. Se `npm run test:coverage` não existir, pare e aponte `docs/testing-strategy.md` §Setup (task de fundação).

## Fase 1 — Escopo

1. Argumento = área (`services`, `utils`, `hooks`, `components`, `pages`) ou ticket Jira (leia via MCP e derive a área).
2. Liste os arquivos da área e rode `npm run test:coverage` para ver a cobertura atual de cada um. Priorize por risco:
   - **Alto:** `src/services/*` (cliente API, refresh de token, mapeamento de `error.code`), `src/utils/*`.
   - **Médio:** `src/hooks/*`, estados de erro/vazio/loading de componentes.
   - Páginas: preferir integração (MSW) e deixar fluxos ponta-a-ponta para E2E.

## Fase 2 — Caracterização (por arquivo)

Para cada arquivo da área, antes de escrever:
- Liste o **comportamento observável** (entradas → saída/efeito), os **branches** (incl. erro/vazio/loading) e cada **`error.code`** do envelope que o código trata.
- Mapeie a camada certa: lógica pura → unit; render/interação → component (Testing Library); tela ↔ API → integration (MSW); fluxo crítico → E2E.

## Fase 3 — Escrever testes significativos

- Use **Testing Library** com queries por `role`/`text` (não por classe CSS/estado interno).
- Use **MSW** (`server.use(...)`) para respostas da API, incluindo o **envelope de erro** padrão; nunca mocke a unidade sob teste.
- Cubra, por comportamento: caminho feliz + **cada caminho negativo** (um teste por `error.code` tratado) + edge (vazio, lista longa, rede lenta/timeout, token expirado→refresh).
- **Proibido (conta como teste ausente):** trivial, snapshot-only, sem `expect`, mock-heavy, asserção de detalhe de implementação, duplicado/`expect(true).toBe(true)`. (Checklist do `/code-review-task` Etapa 4.9.)

## Fase 4 — Verificar e reportar

```bash
npm run test:coverage
```
- Reporte o **delta de cobertura** por arquivo (antes → depois) e os branches ainda descobertos com justificativa.
- Atualize `CHANGELOG.md` (`[Unreleased]`, `(HF-XX)` se houver ticket).
- Não altere código de produção; se um arquivo for **intestável sem refator** (ex.: efeito colateral acoplado), registre como recomendação separada — não refatore dentro desta skill sem aprovação.

## Fase 5 — Gate

Ao concluir uma área, rode `/code-review-task <TICKET-ID>` (se houver ticket) para validar suficiência e qualidade antes do commit. Em fluxo por ticket, esta skill é chamada dentro da Fase 3/4 do `/task`.

## Restrições

- Só testes (e configuração de teste); nenhuma mudança de comportamento de produção.
- Uma área por execução para manter o diff revisável.
