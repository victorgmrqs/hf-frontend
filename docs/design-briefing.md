# Briefing Final — Prompt para Claude Design

> Gerado a partir de [deep-research-prep.md](deep-research-prep.md) e [deep-research.md](deep-research.md) (2026-07-04). Cole o bloco abaixo no Claude Design. Antes de usar, resolva as decisões marcadas em **"Decisões do dono do produto"** no fim.

---

## Prompt para Claude Design

Você é um designer de produto, especialista em UX/UI, Design Systems, acessibilidade e responsividade.

Quero redesenhar a interface de um projeto existente.

### Contexto do produto

**Home Finance (hf-frontend)** — app web de finanças domésticas para **um casal com filhos**. Não é SaaS multi-tenant: é um produto privado de uso familiar recorrente (semanal/mensal), em desktop e celular. O modelo é o mesmo do "Monarch for Couples": **um household, um dashboard e um orçamento compartilhados, com identidade por pessoa** (visão do casal e visão por pessoa).

O eixo de navegação temporal é a **competência** (mês/ano): o usuário seleciona o mês e todas as telas refletem esse período.

**6 telas:**
1. **Dashboard** — visão do mês: cards de Saldo Hoje / Saldo Projetado, totais pessoal/compartilhado, visão familiar, gráfico donut de gastos por categoria, settlement ("quem deve a quem"), despesas recentes, status de orçamentos, contas a pagar próximas.
2. **Despesas** — lista com filtros/busca/paginação; criação e edição via modal, com toggle "compartilhada" que divide o valor entre os membros.
3. **Receitas** — lista com tipos (salário, freelance, investimento…) e recorrência.
4. **Orçamentos** — teto mensal por categoria com barra de progresso (ok / atenção / estourado) e "copiar do mês anterior".
5. **Contas a Pagar** — recorrência, status pendente/pago, badges de urgência (<7 dias) e atraso; pagar gera despesa.
6. **Configurações** — categorias e formas de pagamento.

**Fluxos principais (em ordem de frequência):** registrar despesa (o mais frequente — deve custar ≤ 3 interações de qualquer tela) → ler o dashboard do mês → acompanhar orçamentos → pagar contas → acertar contas entre o casal (settlement).

Hoje a UI tem ~20 componentes, sendo **14 modais** com estrutura consistente (header/corpo/footer), sidebar fixa de 256px e dark mode único.

### Problemas atuais

1. **Sem Design System formal** — só 10 tokens de cor; tipografia, espaçamento, raios, sombras e estados não são definidos; cores de feedback (verde/vermelho/laranja/roxo) usadas inline sem semântica.
2. **Desktop-first** — sidebar fixa de 256px sem versão mobile; o requisito "responsivo ≥ 360px" não é atendido; tabelas só têm scroll horizontal como paliativo.
3. **Dark mode hardcoded** — não existe tema claro nem respeito a `prefers-color-scheme`.
4. **Idioma misto** — telas antigas em inglês ("New Expense", "Loading…"), telas novas em pt-BR; o produto deve ser 100% pt-BR.
5. **Estados inconsistentes** — loading ora skeleton, ora texto; erro ora inline, ora toast.
6. **Acessibilidade parcial** — boa base de ARIA/labels, mas os 14 modais não têm focus trap/gestão de teclado sistemática.

### Objetivo do redesign

Uma interface **consistente, acessível (WCAG 2.2 AA), responsiva de 360px a desktop e implementável de forma incremental**: Design System com tokens semânticos completos (temas claro E escuro), componentes com todos os estados definidos, padrão mobile real (drawer + listas em card), e identidade visual intencional para um produto financeiro doméstico. O redesign é de forma, não de função: os fluxos e regras existentes permanecem.

### Restrições técnicas

- **Stack:** React 19 + Vite + TypeScript strict + react-router 6. **Tailwind CSS 4 no modelo CSS-first**: todos os tokens DEVEM ser expressos como CSS variables na diretiva `@theme` (não existe tailwind.config.js). Cores preferencialmente em **OKLCH**.
- **Componentes:** a base de primitives será **shadcn/ui** (copy-paste, estilo new-york) sobre Radix — proponha componentes compatíveis com essa anatomia (Dialog, Sheet, Table, Select, Form). Ícones: **lucide-react**. Toasts: **sonner** (mantidos).
- **Nenhuma regra de negócio na UI** — o backend é a autoridade; a UI exibe e valida cortesia de UX.
- **Comportamentos obrigatórios do produto (não estéticos):** confirmação antes de excluir; toasts de sucesso/erro; empty states com CTA; badge de urgência em contas; pré-seleção de todos os membros ao marcar despesa como compartilhada; erros de API mapeados para mensagens pt-BR (nunca stack/trace).
- **Terminologia pt-BR obrigatória** (validada contra Nubank/Mobills/Organizze): "despesas"/"receitas"; **"lançamentos"** para listas mistas; "fatura" e "limite disponível" para cartão; "Orçamento" = teto mensal; "Meta" = objetivo de redução; moeda `R$ 1.234,56`; datas `dd/mm/aaaa`. Tom de voz humano e direto (estilo Nubank): "você", frases curtas, sem jargão ("Você ainda não tem despesas este mês").
- **A11y de modais é requisito de aceite** (padrão APG confirmado): focus trap, Escape fecha, `role="dialog"` + `aria-modal="true"` + título como nome acessível, foco inicial no primeiro campo, retorno do foco ao acionador ao fechar.
- **Estado nunca comunicado só por cor** — sempre cor + ícone ou texto (lição do caso de acessibilidade do YNAB).
- O projeto tem gates de teste rígidos — a proposta deve ser **migrável componente a componente**, nunca big-bang.

### Referências de inspiração (inspirar, não copiar)

- **Actual Budget** (open source) — tela de orçamento com **Orçado / Gasto / Disponível** por categoria e navegação mensal. Usar: a clareza das 3 colunas. Evitar: a densidade de planilha (nosso usuário é um casal, não power user).
- **YNAB** — "planejado" e "disponível" **sempre visíveis** por categoria, sem cliques extras; estado por cor + ícone. Evitar: mecânicas invisíveis (nada de dinheiro se movendo sem o usuário ver) e rigidez metodológica.
- **Monarch Money** — modelo de casal (um dashboard, visão por pessoa) e resumo agregado "fixo vs. variável" acima das categorias. Evitar: postura só retrospectiva — nosso app deve mostrar "quanto resta na categoria" no momento do registro da despesa.
- **Copilot Money** — referência de polish visual do segmento (dashboard do mês, categorias agrupadas com progresso). Evitar: qualquer coisa que assuma um único usuário.
- **Nubank / Mobills / Organizze** (pt-BR) — toggle de olho para ocultar valores no saldo (convenção esperada no Brasil); distinção clara "saldo atual" vs. "saldo previsto"; barra de progresso com alerta de proximidade do teto; botão "+" proeminente para nova despesa. Evitar: copiar a identidade roxa do Nubank.
- **Maybe Finance** — referência visual de dashboard financeiro polido (Tailwind + Lucide, como nós). **Só inspiração visual — é AGPL, proibido copiar código/markup.**
- **Splitwise** — settlement: comunicar as garantias do acerto em linguagem simples ("ninguém paga mais, só menos transferências"), com direção visual clara devedor→credor.
- **Design Systems:** Primer (nomenclatura de tokens: `fg`/`bg`/`border` × `default`/`muted`/`emphasis`); Polaris (anatomia de página, formulários, empty states com CTA); Material 3 (state layers — overlay na cor do conteúdo com opacidade fixa por estado — e dark theme por color roles).

### Direção visual desejada

**Confiável, calma e doméstica** — é a ferramenta de finanças da família, não um terminal de trading: limpa, moderna, amigável, com números como protagonistas (valores monetários grandes e legíveis). Ponto de partida: o dark azul atual (`#137fec` sobre `#101922`) é competente e tem disciplina de contraste — **apresente 2–3 direções**: (a) evolução dessa identidade para escala completa dark+light; (b) ao menos uma identidade alternativa. Em todas: semântica financeira fixa (verde = receita/positivo, vermelho = despesa/estouro, âmbar = atenção, uma cor própria para "compartilhado") e contraste AA anotado por par de cores.

### Entregáveis esperados do Claude Design

Gere:

1. proposta de direção visual (2–3 opções com racional e trade-offs);
2. paleta de cores (dark + light, OKLCH, razões de contraste anotadas);
3. tipografia sugerida (escala com papéis: display para valores monetários, heading, body, caption);
4. escala de espaçamento;
5. radius;
6. sombras/elevation;
7. tokens visuais iniciais — **nomeados como CSS variables prontas para `@theme` do Tailwind 4**, em duas camadas (primitivas + semânticas: `--color-surface`, `--color-text-muted`, `--color-positive`, `--color-warning`…);
8. componentes base (Button, Input, Select, campo monetário, Dialog/Modal, Card, Badge, Tabela) com **todos os estados**: default, hover, focus-visible, active, disabled, loading, erro;
9. padrões de formulário (modais de criação/edição; valor monetário grande no topo — padrão atual a preservar; validação inline);
10. padrões de navegação (sidebar colapsável no desktop → drawer off-canvas no mobile; seletor de competência persistente com atalhos ← →; botão global "Nova despesa");
11. padrões de cards (métrica de saldo com toggle olho; card de orçamento com progresso; card de settlement);
12. padrões de tabelas/listagens (tabela no desktop → **cards empilhados no mobile**, hierarquia valor > descrição > metadados; alvos de toque ≥ 44px);
13. estados de loading (skeleton unificado), empty (ilustração/ícone + CTA), error (mensagem pt-BR + retry) e success (toast);
14. recomendações de responsividade (comportamento por breakpoint: base 360px, tablet, desktop; onde usar container queries);
15. recomendações de acessibilidade (foco visível, ordem de tabulação, alternativa textual ao gráfico donut, contraste por token);
16. proposta das telas prioritárias (mobile 360px E desktop para cada);
17. variações visuais para comparação;
18. documentação de handoff para Claude Code.

### Telas prioritárias

1. **Dashboard** (leitura do mês + settlement) — define a identidade.
2. **Modal de despesa** (fluxo mais frequente; destrava o padrão dos 14 modais).
3. **Orçamentos** (progresso por categoria).
4. **Despesas** (tabela→cards responsiva).
5. **Contas a Pagar** (urgência/atraso).
6. Sidebar/navegação responsiva (transversal).

### Critérios de avaliação

A proposta deve ser avaliada por: clareza; consistência visual; acessibilidade; contraste; responsividade; facilidade de implementação; compatibilidade com a stack (Tailwind 4 `@theme` + shadcn/Radix); aderência ao propósito do produto; qualidade do handoff para desenvolvimento.

### Instrução final

Não gere apenas uma interface bonita. Gere uma proposta funcional, acessível, responsiva e implementável.

Explique as decisões visuais e os trade-offs.

Ao final, gere uma seção chamada **"Handoff para Claude Code"**, com instruções para implementação incremental no repositório: tokens finais em formato `@theme`; ordem de migração sugerida (tokens → Dialog base e modais → Button/Input → sidebar responsiva → tabelas→cards → estados → telas); mapeamento dos 10 tokens atuais para os novos; e o conteúdo estruturado para `DESIGN.md` (direção, princípios, layouts) e `DESIGN_SYSTEM.md` (tokens, componentes, variantes, estados) — em markdown versionável.

---

## Decisões do dono do produto (preencher antes de usar)

1. **Identidade:** evoluir o dark azul atual ou abrir para nova identidade? *(o prompt pede as duas — corte uma se já decidiu)*
2. **Escopo:** tela de login e Metas (MET) entram neste redesign? *(hoje o prompt os deixa fora)*
3. **Prioridade:** mobile ou desktop como plataforma principal do casal?
4. **React 19:** upgrade aprovado? *(o prompt já assume que sim — pré-requisito do caminho shadcn/ui)*
