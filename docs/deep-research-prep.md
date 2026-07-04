# Resumo Preparatório para Deep Research

**Tema técnico:** Redesign UX/UI, responsividade e Design System para o **hf-frontend** (Home Finance).

**Data:** 2026-07-04 · **Status:** análise concluída, nenhum arquivo de código alterado.

---

## 1. Motivação / Problema a resolver

O produto é funcional e bem testado, mas o design cresceu organicamente, "documentado no código" em vez de num sistema formal:

- **Sem Design System formal.** Existem 10 tokens de cor em `src/index.css` (`@theme` do Tailwind 4), mas não há documentação de tipografia, espaçamento, elevação, estados ou variantes de componentes. Não há DESIGN.md, Figma ou Storybook.
- **Dark mode hardcoded.** O tema escuro é forçado via classe `dark` no root (`App.tsx`), sem respeitar `prefers-color-scheme` e sem tema claro utilizável — o token `--color-background-light` existe mas nunca é alcançado.
- **Responsividade desktop-first frágil.** A `Sidebar` é fixa com 256px (`w-64 fixed` + `ml-64` no main); abaixo de ~768px o conteúdo fica espremido e não há padrão mobile (drawer/bottom-nav). Único breakpoint usado com frequência é `md:`. Tabelas dependem de `overflow-x-auto`. O CLAUDE.md exige UI responsiva ≥ 360px — hoje isso provavelmente não se sustenta (hipótese a validar; e2e não cobre viewports móveis).
- **Idioma inconsistente.** A UI declara pt-BR (moeda, datas, erros mapeados), mas há textos em inglês espalhados: "New Expense", "Add Expense", "Loading...", "No expenses...", "Category", "Shared Expense?". Viola a restrição "interface em pt-BR" do CLAUDE.md.
- **Estados loading/erro ad-hoc.** `EmptyState` é centralizado, mas loading varia entre skeleton (BalanceCards) e texto "Loading..." em tabelas; erros ora inline, ora toast — sem padrão único.
- **Dependência morta:** Bootstrap 5.3.3 está no package.json mas não é importado em lugar nenhum — peso e ambiguidade de stack sem benefício.
- **Acessibilidade parcial.** Boa base (aria-label, labels em inputs, axe nos testes de modal e na home), mas navegação por teclado, focus trap em modais, contraste sistemático e leitores de tela não são cobertos de forma abrangente.

## 2. Foco principal da pesquisa

1. **Design System** adequado a Tailwind 4 + React 18 (tokens, tema claro/escuro, tipografia, escala de espaçamento).
2. **Bibliotecas UI headless/acessíveis** compatíveis com a stack: shadcn/ui, Radix UI, Headless UI, React Aria — vs. manter componentes próprios.
3. **Padrões de layout responsivo** para dashboards financeiros: sidebar colapsável/drawer, bottom navigation mobile, tabelas → cards em telas pequenas.
4. **Acessibilidade** WCAG 2.2 AA: focus management em modais, navegação por teclado, contraste em dark mode, gráficos acessíveis (donut chart).
5. **UX de finanças pessoais/familiares**: visualização de saldo, orçamento com alertas, divisão de despesas entre casal (settlement "quem deve a quem").
6. **Estratégia de tokens**: migração dos 10 tokens atuais para uma escala semântica completa (surface/border/text/feedback), com suporte a temas.
7. **Padrões de estados**: skeleton loading unificado, empty states, error states com retry.

## 3. Contexto de aplicação

- **Produto:** Home Finance — gerenciador financeiro doméstico para um **casal com filhos**. Despesas pessoais e compartilhadas (com divisão automática e liquidação), receitas, orçamento mensal por categoria, contas a pagar com recorrência, saldo hoje/projetado, metas.
- **Usuários prováveis:** 2 adultos da mesma família, uso recorrente (mensal/semanal), provavelmente em desktop e celular. Não é SaaS multi-tenant; é um produto privado/familiar. Login ainda não existe no frontend (JWT suportado no cliente, tela pendente).
- **Telas (6 rotas):** Dashboard (visão geral do mês), Despesas, Receitas, Orçamentos, Contas a Pagar, Configurações (categorias e formas de pagamento).
- **Fluxos principais:** selecionar competência → visualizar dashboard → CRUD de despesas/receitas/orçamentos/contas via modais → alertas de orçamento e settlement.
- **Onde a pesquisa será aplicada:** briefing para o Claude Design redesenhar as 6 telas + ~20 componentes (14 são modais/cards), preservando arquitetura (`pages/`, `components/`, `services/`) e regras de negócio (autoridade do backend).

## 4. Nível de profundidade desejado

Equilibrado entre conceitual e prático: princípios de Design System e UX financeira **com** recomendações diretamente aplicáveis ao código (Tailwind 4 `@theme`, React 18, TS strict) e ao Claude Design.

## 5. Tecnologias / stack relevante

**Stack real (confirmada no package.json):**

- Vite 5.4 · React 18.3 · TypeScript 5.6 strict · react-router-dom 6.27
- Tailwind CSS 4.1 (via `@tailwindcss/postcss`, tokens em `@theme`)
- Bootstrap 5.3.3 **instalado mas não utilizado** (candidato a remoção)
- lucide-react (ícones) · sonner (toasts)
- Testes: Vitest 4 + Testing Library + MSW 2 + Playwright 1.61 + axe-core (gates de cobertura 80% global / 90% services+utils)

**Tecnologias a considerar na pesquisa:** shadcn/ui, Radix Primitives, React Aria / Headless UI, CVA/tailwind-variants, Recharts/visx (gráficos acessíveis), tokens W3C Design Tokens format, container queries do Tailwind 4.

## 6. Casos reais / exemplos a incluir

Sim — tipos de referência úteis:

- **Design Systems públicos:** shadcn/ui, Radix Themes, Atlassian DS, GOV.UK (a11y), Primer (GitHub), Polaris (Shopify — forte em formulários/tabelas).
- **Produtos financeiros similares:** YNAB, Monarch Money, Copilot Money, Mobills/Organizze (pt-BR), Splitwise (divisão de despesas entre pessoas — diretamente relevante ao settlement), Nubank (padrões pt-BR de moeda/UX).
- **Dashboards open source:** Maybe Finance (open source, finanças pessoais, React), Actual Budget (open source, orçamento), Firefly III (frontend de referência de features, não de visual).
- **Padrões específicos:** tabelas responsivas → cards; dark mode com contraste AA; donut charts acessíveis; formulários monetários (input de valor grande no topo do modal — padrão já usado no ExpenseModal, validar contra mercado).

## 7. Resultado esperado da pesquisa

Base para:

1. Criar o **briefing para Claude Design** (direção visual + restrições técnicas).
2. Definir **direção visual** (manter dark azul atual vs. nova identidade; tema claro).
3. Sugerir **Design System** (adotar shadcn/ui vs. formalizar o sistema próprio).
4. Definir **tokens** (escala semântica completa: cor, tipografia, espaço, raio, sombra, motion).
5. Orientar **responsividade** (estratégia mobile ≥ 360px: sidebar → drawer, tabelas → cards).
6. Orientar **acessibilidade** (WCAG 2.2 AA, focus trap, teclado, gráficos).
7. Documentar **DESIGN.md** (direção, princípios, layouts por tela).
8. Documentar **DESIGN_SYSTEM.md** (tokens, componentes, variantes, estados).
9. Orientar a **implementação futura pelo Claude Code** (ordem de migração, sem quebrar gates de teste).

---

## 8. Perguntas ainda em aberto

1. O produto deve ter **tema claro** ou o dark mode é decisão de produto? (hoje é hardcoded)
2. Qual a real distribuição de uso **mobile vs. desktop** do casal? Define a prioridade da estratégia responsiva.
3. Haverá **tela de login** no redesign (JWT já suportado no cliente) ou fica fora de escopo?
4. Os textos em inglês são débito conhecido ou intencional? Redesign deve incluir passada de i18n/pt-BR?
5. Existe apego à identidade visual atual (azul `#137fec` sobre `#101922`) ou o redesign pode propor nova paleta?
6. As telas de **metas (MET)** do backend ainda não têm rota no frontend — entram no escopo do redesign?
7. Adotar biblioteca de componentes (shadcn/ui) implica reescrever os 14 modais — o custo é aceitável frente aos gates de cobertura?

## 9. Hipóteses sobre o produto

- **H1:** Produto de uso privado do próprio desenvolvedor e família (2 usuários), não multi-tenant — o "user switcher" na Sidebar troca o usuário sem auth real.
- **H2:** Design atual foi desktop-first; mobile ≥ 360px é requisito documentado mas não verificado (sem e2e de viewport).
- **H3:** Bootstrap foi adicionado no início e abandonado quando Tailwind 4 assumiu — é seguro remover.
- **H4:** A mistura pt-BR/inglês vem de telas antigas (Dashboard/Expenses em inglês) vs. novas (Income/Budgets em pt-BR) — telas mais recentes já seguem a regra.
- **H5:** O padrão consistente dos modais (header/body/footer, backdrop, tokens) indica que uma migração incremental para primitives acessíveis (Radix/shadcn) é viável sem big-bang.

## 10. Riscos de redesign sem pesquisa

- **Quebrar gates de teste:** cobertura 80% global / 90% em services+utils e testes a11y de modal falham se componentes forem reescritos sem estratégia de migração de testes.
- **Regressão de acessibilidade:** a base atual (aria, axe) é razoável; adotar biblioteca errada ou reescrever modais sem focus management piora o que existe.
- **Escolher biblioteca incompatível:** Tailwind 4 mudou o modelo de config (CSS-first `@theme`); bibliotecas presas ao Tailwind 3 (plugins JS) geram atrito.
- **Retrabalho visual sem tokens:** redesenhar telas antes de definir a escala de tokens repete o problema atual (valores inline espalhados).
- **Perder padrões de negócio embutidos na UI:** UX-01–UX-08 do RULES.md (confirmação de exclusão, badges de urgência, pré-seleção em despesa compartilhada) são regras, não estética — o redesign precisa preservá-los.
- **Contraste em dark mode:** os comentários AA em `index.css` mostram cuidado já tomado; nova paleta sem verificação de contraste regride WCAG.

## 11. Sugestões iniciais de referências a pesquisar

- shadcn/ui + Radix (compatibilidade com Tailwind 4; padrões de Dialog/Sheet/Table)
- React Aria Components (a11y-first, alternativa a Radix)
- Maybe Finance e Actual Budget (open source, mesma categoria de produto)
- Splitwise (UX de divisão de despesas e settlement entre pessoas)
- Mobills / Organizze / Nubank (convenções pt-BR de finanças)
- Polaris (Shopify) — formulários e tabelas densas; GOV.UK — acessibilidade
- Tailwind 4 docs: `@theme`, container queries, dark mode com `prefers-color-scheme`
- WCAG 2.2 AA + APCA (contraste em dark mode)
- W3C Design Tokens Community Group format (para DESIGN_SYSTEM.md)

## 12. O que passar ao Claude Design após a pesquisa

1. **Este documento** + resultado da Deep Research consolidado.
2. **Inventário factual:** 6 rotas, ~20 componentes (14 modais), tokens atuais de `src/index.css`, screenshots das telas atuais.
3. **Restrições não negociáveis** (do CLAUDE.md): pt-BR, responsivo ≥ 360px, estados loading/erro/vazio explícitos, sem regra de negócio no front, erros via `errorMessage.ts`.
4. **Regras UX-01–UX-08** do RULES.md (comportamentos obrigatórios, não estéticos).
5. **Decisões tomadas** a partir das perguntas em aberto (tema claro? biblioteca? escopo mobile? i18n?).
6. **Direção visual escolhida** com paleta validada para contraste AA.
7. **Pedido de entregáveis:** DESIGN.md + DESIGN_SYSTEM.md + specs por tela, em formato consumível pelo Claude Code (tokens em `@theme` Tailwind 4, nomes de componentes/variantes, ordem de migração incremental que respeite os gates de teste).
