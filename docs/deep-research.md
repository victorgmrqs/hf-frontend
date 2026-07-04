# Deep Research — Redesign UX/UI, Responsividade e Design System (hf-frontend)

**Data:** 2026-07-04 · **Entrada:** [deep-research-prep.md](deep-research-prep.md) · **Método:** harness multi-agente em duas rodadas — rodada 1 (5 ângulos, 23 fontes, 114 claims, 25 verificados adversarialmente → 8 confirmados, 1 refutado) + rodada 2 complementar (8 agentes: verificação dos claims pendentes contra fontes primárias + benchmark YNAB/Monarch/Copilot/pt-BR/Maybe/DS públicos — todos os pendentes confirmados).

**Legenda de confiabilidade usada neste documento:**

- ✅ **Verificado** — claim confirmado adversarialmente (2-3 votos) contra fonte primária em 2026-07-04.
- ⚠️ **Não verificado nesta rodada** — conhecimento padrão da área ou leitura de fonte primária cuja verificação adversarial foi abortada por limite de sessão (voto 0-0); reconfirmar na fonte antes de tratar como fato.
- ❌ **Refutado** — claim derrubado na verificação (0-3); não usar.
- 🔷 **Recomendação visual** · 🔧 **Recomendação técnica** · ❓ **Hipótese**

---

## 1. Contexto do projeto

**hf-frontend** é o frontend web do **Home Finance**: gerenciador financeiro doméstico para um casal com filhos. Cobre despesas pessoais e compartilhadas (divisão automática + settlement "quem deve a quem"), receitas, orçamento mensal por categoria, contas a pagar com recorrência, saldo hoje/projetado e metas (backend pronto, sem rota no front).

- **Stack:** Vite 5 · React 18.3 · TypeScript strict · react-router-dom 6 · **Tailwind CSS 4.1 (CSS-first, `@theme`, 100% da estilização)** · lucide-react · sonner. Bootstrap 5.3.3 instalado e **não usado**.
- **Estrutura:** 6 rotas (Dashboard, Despesas, Receitas, Orçamentos, Contas a Pagar, Configurações), ~20 componentes (14 modais com padrão consistente), Sidebar fixa 256px, dark mode hardcoded.
- **Testes:** Vitest + Testing Library + MSW + Playwright + axe; gates de cobertura 80% global / 90% em `services` e `utils`.
- **Autoridade de regras de negócio é o backend**; o front só faz validação de UX.

## 2. Objetivo do redesign

Sair de um design "documentado no código" para um **Design System formal** (tokens, componentes, estados, temas), com **responsividade real ≥ 360px**, **acessibilidade WCAG 2.2 AA sistemática** (foco em modais e teclado), **idioma 100% pt-BR** e uma direção visual intencional — produzindo `DESIGN.md` e `DESIGN_SYSTEM.md` consumíveis pelo Claude Design (direção/protótipos) e pelo Claude Code (implementação incremental sem quebrar os gates de teste).

## 3. Diagnóstico inicial do tipo de produto

- **Categoria:** finanças pessoais/familiares, subcategoria "orçamento por envelope/categoria + divisão de despesas entre pessoas". É a interseção de dois domínios com referências fortes: apps de orçamento (YNAB, Actual Budget) e apps de divisão de despesas (Splitwise).
- **Usuários:** 2 adultos da mesma família, uso recorrente. ❓ Hipótese H1 (do prep): produto privado, não multi-tenant — o "user switcher" troca usuário sem auth real.
- **Modelo mental do usuário:** ciclo mensal (competência) → registrar → acompanhar orçamento → acertar contas entre o casal. O seletor de competência é o eixo de navegação temporal de todas as telas.

## 4. Principais problemas a resolver

1. **Sem Design System formal** — 10 tokens de cor em `@theme`, nada de tipografia/espaçamento/estados/variantes documentados.
2. **Desktop-first** — Sidebar fixa 256px + `ml-64`; requisito "responsivo ≥ 360px" do CLAUDE.md não atendido; único breakpoint recorrente é `md:`.
3. **Dark mode hardcoded** — classe `dark` no root; tema claro inalcançável; sem `prefers-color-scheme`.
4. **Idioma misto** — telas antigas em inglês ("New Expense", "Loading...") vs. novas em pt-BR.
5. **Estados ad-hoc** — skeleton em BalanceCards vs. "Loading..." em tabelas; erro ora inline, ora toast.
6. **A11y parcial** — boa base (aria, axe em modais/home), mas sem focus trap/teclado sistemáticos nos 14 modais.
7. **Dependência morta** — Bootstrap 5.3.3 sem nenhum import. 🔧 Remover.

## 5. Referências de mercado (produtos financeiros)

### 5.1 Splitwise — settlement/divisão de despesas ✅ Verificado (3-0 e 2-1)

O recurso **"simplify debts"** colapsa dívidas transitivas (A deve a B, B deve a C → A paga C diretamente) para reduzir o número de pagamentos, sob **três invariantes explícitas**: (1) o saldo líquido de cada pessoa não muda; (2) ninguém passa a dever a quem não devia antes; (3) ninguém deve mais no total após a simplificação. O algoritmo é heurístico — reduz pagamentos, não garante o mínimo ótimo. Fontes: [blog oficial do Splitwise (CTO)](https://blog.splitwise.com/2012/09/14/debts-made-simple/), [helpdesk](https://feedback.splitwise.com/knowledgebase/articles/107220).

- **Por que é relevante:** é a referência canônica do fluxo de settlement do Home Finance (Dashboard já calcula "quem deve a quem").
- **Aproveitar:** comunicar as garantias do acerto ao usuário em linguagem simples ("ninguém paga mais, só menos transferências"); tela de saldo entre pessoas com direção visual clara (setas/cores devedor→credor); registro de "acerto" como evento de primeira classe.
- **Não copiar:** para 2 pessoas a simplificação transitiva é trivial — não superestruturar; a UI social do Splitwise (grupos, feed) não se aplica a um casal.
- **Risco/trade-off:** implementar settlement no front violaria a regra "regra de negócio é do backend" — a UI só exibe o que o backend calcula.

### 5.2 Actual Budget — referência open source mais forte ✅ Verificado (3-0)

App local-first, 100% gratuito, MIT, ativo (~27k stars, push em 2026-07-04). Modelo padrão é **envelope budgeting**: categorias como envelopes numa tabela mensal **Budgeted / Spent / Balance**, zero-sum com carry-over mensal (mais rico que um teto simples por categoria); há modo alternativo "Tracking Budget". Fontes: [github.com/actualbudget/actual](https://github.com/actualbudget/actual), [docs de envelope budgeting](https://actualbudget.org/docs/getting-started/envelope-budgeting/).

- **Aproveitar:** a tabela mensal de orçamento (3 colunas por categoria) como referência de UI para a tela de Orçamentos; navegação por mês idêntica ao conceito de competência; é código aberto — o Claude Design/Code pode inspecionar layouts reais.
- **Não copiar:** a densidade de planilha do Actual serve a power users; para um casal, a barra de progresso colorida que o hf-frontend já tem pode ser mais legível — considerar híbrido.
- **Trade-off:** envelope zero-sum ("todo real tem um destino") é uma mudança de modelo de negócio, não de UI — fora do escopo do redesign (backend decide).

### 5.3 YNAB ✅ (rodada 2, fontes oficiais)

- **Aproveitar — "Assigned" e "Available" sempre visíveis:** cada linha de categoria responde "quanto planejei" e "quanto ainda posso gastar" sem cliques extras, inclusive no mobile ([guia oficial](https://support.ynab.com/en_us/assigning-your-money-a-guide-SypgkrNJi)).
- **Aproveitar — semântica de cor no "Available":** amarelo = subfinanciado/atenção, vermelho = negativo urgente; após crítica de acessibilidade, o YNAB adicionou **ícones além da cor** ([docs](https://support.ynab.com/en_us/colors-and-icons-in-your-plan-HJQv_XHko), [case de a11y](https://racheleditullio.com/blog/2019/05/ynab-addresses-color-accessibility/)) — reforça a diretriz "cor nunca sozinha" do §11.
- **Aproveitar — ações em massa no orçamento:** Auto-Assign ("Assigned Last Month", "Spent Last Month", "Underfunded") reduz o atrito de re-orçar todo mês ([docs](https://support.ynab.com/en_us/auto-assign-a-guide-r1gBNbBJo)). O hf-frontend já tem "copiar do mês anterior" — adicionar "preencher com o gasto real do mês anterior" é a extensão natural (regra no backend).
- **NÃO copiar — movimentação invisível de dinheiro:** o tratamento de cartão do YNAB move valores entre categorias silenciosamente e é a crítica mais recorrente do produto. Lição: todo efeito de uma despesa deve ser visível na tela onde foi registrada.

### 5.4 Monarch Money ✅ (rodada 2, fontes oficiais)

- **Aproveitar — modelo de casal:** um household, um dashboard e um orçamento compartilhados; logins e notificações separados por pessoa ([Monarch for Couples](https://help.monarchmoney.com/hc/en-us/articles/20926382202004-Monarch-for-Couples)). É exatamente o modelo do Home Finance — valida a arquitetura de produto atual.
- **Aproveitar — visão por pessoa + "tag para revisar":** alternar visão casal vs. por pessoa e marcar o parceiro para conferir um lançamento ([couples page](https://www.monarchmoney.com/solutions/couples)) — mecanismo de colaboração leve e de alto valor. ❓ Candidato a feature futura (backend).
- **Aproveitar — resumo "fixo vs. variável":** o Flex Budgeting agrupa em Fixed/Non-monthly/Flex acima das categorias ([docs](https://help.monarch.com/hc/en-us/articles/32125337244052-Using-Flex-Budgeting)); mesmo mantendo orçamento por categoria, um agregado fixo/variável no dashboard reduz carga cognitiva.
- **NÃO copiar — postura puramente retrospectiva:** reviews apontam que o Monarch "rastreia depois do fato". O HF deve dar feedback proativo: mostrar "quanto resta na categoria" no momento do registro da despesa. (A hipótese de "dashboard poluído" **não** se confirmou — o design do Monarch é elogiado; vale como moodboard.)

### 5.5 Copilot Money ✅ (rodada 2, fontes oficiais)

- **Aproveitar — pré-preenchimento inteligente:** o fluxo de "review" do Copilot aprende das correções do usuário ([docs](https://help.copilot.money/en/articles/8182433-copilot-intelligence-for-spending)); o análogo para registro manual é pré-preencher categoria/forma de pagamento/divisão com base no histórico (última escolha por descrição).
- **Aproveitar — orçamento por mês + "Rebalance":** valores herdados por padrão com override mensal, e ação de realocar sobra de outra categoria quando uma estoura ([docs](https://help.copilot.money/en/articles/6206302-rebalancing-your-budget)).
- **Aproveitar — referência de polish visual** do segmento (dashboard do mês corrente, categorias agrupadas com progresso).
- **NÃO copiar — modelo single-user:** sem household/multiusuário, casais dividem um login ("clunky", crítica unânime — [Forbes](https://www.forbes.com/advisor/banking/copilot-budget-app-review/)); anti-padrão exato para o HF.

### 5.6 Convenções pt-BR — Nubank, Mobills, Organizze ✅ (rodada 2)

- **Terminologia (adotar):** "despesas"/"receitas" como rótulos primários (Mobills — alinha com DSP/REC); **"lançamento"** como termo guarda-chuva para listas mistas — "Últimos lançamentos", não "Últimas transações" (Organizze); "fatura", "fatura em aberto/fechada", "limite disponível" para cartão de crédito (Nubank); "Meta" para objetivo de redução (MET) e "Orçamento" para teto mensal (ORC) — exatamente a divisão do Mobills.
- **Tom de voz (Nubank/NuDS):** humano, "você", frases curtas, sem juridiquês nem jargão técnico; erros e vazios diretos ("Você ainda não tem despesas este mês") — referência para o passe pt-BR e para o `errorMessage.ts`.
- **Padrões visuais de categoria:** saldo no topo com **toggle olho para ocultar valores** (convenção esperada em app financeiro brasileiro — privacidade em público); barra de progresso por categoria com alerta de proximidade do teto (Mobills "Planejamento Mensal" — mais acionável que pizza sozinha); **"saldo atual" vs. "saldo previsto"** distintos no dashboard (Organizze — o HF já tem Hoje/Projetado, validado como padrão de categoria); despesa vermelho / receita verde / valores negativos "no vermelho".
- **Formatação:** `R$ 1.234,56`, datas `dd/mm/aaaa`, via `Intl` nativo centralizado em `src/utils` (já é a prática do projeto).
- **FAB/botão "+" para nova despesa** como fluxo de um toque (Mobills) — reforça a diretriz §9.4.

## 6. Referências open source

| Projeto | Status | Uso no redesign |
|---|---|---|
| **Actual Budget** (MIT) | ✅ Verificado | Referência principal de UI de orçamento e navegação mensal; código inspecionável. |
| **Maybe Finance** (AGPL-3.0) | ✅ Verificado (rodada 2) | **Arquivado em 27/07/2025** (empresa pivotou para B2B); código congelado, público e rodável via Docker com demo data — referência visual **estável** de dashboard financeiro (54k stars, UI polida, usa Tailwind + Lucide como o HF). Ressalvas: frontend é **Rails + Hotwire, não React** (referência de visual, não de código); foco é patrimônio/net worth, não despesas de casal; **AGPL-3.0 — inspiração visual livre, cópia de código/markup contamina a licença**, e a marca "Maybe" não pode ser usada. Fork comunitário ativo: [we-promise/sure](https://github.com/we-promise/sure). |
| **Firefly III** | ⚠️ Não pesquisado | Referência de completude de features, não de visual. |

## 7. Comparativo de Design Systems públicos

Os três DS recomendados na síntese foram confirmados nas fontes oficiais na rodada 2 (✅); os demais permanecem análise do pesquisador (⚠️).

**Confirmações da rodada 2:**
- **Primer** ✅ — tokens funcionais por propriedade CSS (`fgColor`/`bgColor`/`borderColor`) com variantes semânticas `muted`/`emphasis` (e `onEmphasis` para conteúdo sobre fundos fortes), em 3 camadas base→funcional→componente ([color overview](https://primer.style/foundations/color/overview/), [token names](https://primer.style/product/primitives/token-names/)). Mapeia direto para `@theme`: `--color-fg-default`, `--color-fg-muted`, `--color-border-default`…
- **Polaris** ✅ — guidance formal de [Empty state](https://polaris-react.shopify.com/components/layout-and-structure/empty-state) ("oportunidade de explicar e guiar à próxima ação"), [FormLayout](https://polaris-react.shopify.com/components/layout-and-structure/form-layout) (agrupar por tarefa, labels curtos) e [seção Patterns](https://polaris-react.shopify.com/patterns). Nota: o domínio canônico atual é `polaris-react.shopify.com`.
- **Material 3** ✅ — dark theme integrado aos color roles (pares light/dark acessíveis por construção — [roles](https://m3.material.io/styles/color/roles)); [state layers](https://m3.material.io/foundations/interaction/states/state-layers): overlay semitransparente na cor do conteúdo com **opacidade fixa por estado** (hover/focus/pressed) — receita direta para padronizar estados no Tailwind (ex.: `bg-current` com opacidades fixas).

| DS | Relevância p/ HF | Aproveitar | Não copiar | Risco |
|---|---|---|---|---|
| **Material 3** | Baixa-média | Escala de elevação/estados (state layers), guidance de dark theme | Estética Material inteira (identidade Google forte) | Visual "app Android genérico" |
| **Primer (GitHub)** | Média | Tokens semânticos (`fg/bg/border` + `default/muted/emphasis`), densidade de tabelas | Componentes acoplados a React da Primer | Nomenclatura ótima, implementação não portável |
| **Atlassian** | Média | Documentação de tokens e guidance de conteúdo/microcopy | Complexidade enterprise | Overkill para 6 telas |
| **Carbon (IBM)** | Média | Data tables densas, especificação rigorosa de estados por componente | Grid 2x, estética IBM | Rigidez |
| **Fluent 2** | Baixa | Padrões de teclado/focus | Acoplamento ao ecossistema MS | — |
| **Polaris (Shopify)** | **Alta** | Formulários e tabelas de admin, empty states com CTA, padrões de página (header + ações) — o HF é essencialmente um admin doméstico | Tom lojista | Melhor referência estrutural, não visual |

🔷 **Síntese para o Claude Design:** usar **Primer como referência de nomenclatura de tokens semânticos**, **Polaris como referência de anatomia de página/formulário/empty state**, e Material 3 apenas para guidance de dark theme e state layers.

## 8. Comparativo de bibliotecas UI (compatibilidade real com Tailwind 4 CSS-first)

Este era o ponto de maior incerteza técnica; dois achados foram verificados:

### 8.1 shadcn/ui ✅ Verificado (3-0) — candidato de menor atrito; questão React 18 **resolvida na rodada 2**

Docs oficiais confirmadas ao vivo em 2026-07-04: **suporte oficial e completo a Tailwind v4** — CLI inicializa com v4, suporte pleno a `@theme` e `@theme inline` (exatamente o modelo do hf-frontend), todos os componentes atualizados. Na versão Tailwind v4: cores migradas de HSL para **OKLCH**, estilo `default` deprecado em favor de `new-york`, `forwardRef` removido, e **componente toast deprecado em favor do sonner — que o hf-frontend já usa**. Fontes: [ui.shadcn.com/docs/tailwind-v4](https://ui.shadcn.com/docs/tailwind-v4), [changelog](https://ui.shadcn.com/docs/changelog/2025-02-tailwind-v4).

**Questão React 18 — resolvida ✅ (rodada 2):** os componentes atuais (estilo `new-york-v4`) são direcionados a **React 19** — `ref` é passado como prop normal, sem `forwardRef`. Fato técnico confirmado na doc do React: em **React 18, ref-como-prop não funciona** — o componente renderiza, mas qualquer ref fica `null` com warning ("Function components cannot be given refs"), quebrando silenciosamente foco programático e integrações como react-hook-form ([react.dev/blog React 19](https://react.dev/blog/2024/12/05/react-19), issue real de usuário TW4+React 18: [shadcn-ui/ui#6739](https://github.com/shadcn-ui/ui/issues/6739)). O caso do hf-frontend (**Tailwind 4 + React 18**) é exatamente a combinação problemática: o CLI instalaria componentes sem `forwardRef`. Caminhos confirmados:
1. 🔧 **Upgrade React 18→19 como pré-requisito** (recomendado — base pequena, e destrava o caminho padrão do shadcn);
2. Estilo legado `new-york` (Tailwind v3, com `forwardRef`) — **incompatível com o Tailwind 4 do projeto**, descartado;
3. Re-adicionar `forwardRef` manualmente nos componentes copiados (viável por serem código no repo — é o inverso do codemod oficial `remove-forward-ref` — mas cria atrito permanente a cada componente adicionado).
- **Aproveitar:** modelo copy-paste (o código entra no repo, testável pelos gates existentes — não é dependência opaca); Dialog/Sheet/Table/Select/Form; convenção de CSS variables semânticas (`--background`, `--foreground`, `--primary`...) que casa com a migração de tokens do §15.
- **Não copiar:** adotar a estética new-york por inércia — o Claude Design deve decidir a direção visual; shadcn é a *infraestrutura*, não a identidade.
- **Trade-off:** copy-paste = manutenção sua (atualizações manuais); em troca, zero lock-in e cobertura de teste sob seu controle.

### 8.2 React Aria Components + plugin Tailwind ✅ Verificado (2-0)

O pacote **`tailwindcss-react-aria-components`** é oficial do ecossistema Adobe (repo `adobe/react-spectrum`, mantido por Devon Govett) e adiciona variants Tailwind para os data attributes de estado dos React Aria Components (hover/pressed/selected/focused/disabled). A **major 2.x declara peerDependency `tailwindcss: ^4.0.0`** (latest 2.2.0, 2026-06-18) — suporte de primeira classe ao Tailwind 4. Qualificação verificada: Tailwind 4 já suporta variants `data-*` nativamente; o plugin é conveniência (seletores curtos, forced-colors), não requisito. Fontes: [npm](https://www.npmjs.com/package/tailwindcss-react-aria-components), [adobe/react-spectrum](https://github.com/adobe/react-spectrum).

- **Relevância:** resolve diretamente a lacuna "estados de interface sistemáticos" do diagnóstico — estados de interação consistentes entre mouse/toque/teclado, estilizáveis em Tailwind.
- ✅ **Confirmado na rodada 2** ([styling.html](https://react-spectrum.adobe.com/react-aria/styling.html)): "React Aria does not include any styles by default… Each component accepts the standard className and style props"; estados expostos como data attributes ("data-hovered and data-pressed… work consistently between mouse, touch, and keyboard modalities") usáveis como `data-[selected]:bg-...`; plugin 2.x registrado via `@plugin "tailwindcss-react-aria-components"` no CSS (Tailwind 4), 1.x via `tailwind.config.js` (Tailwind 3). E o [useDialog](https://react-spectrum.adobe.com/react-aria/useDialog.html) implementa exatamente o que falta ao HF: "Focus is moved into the dialog on mount, and restored to the trigger element on unmount. While open, focus is contained within the dialog".
- **Trade-off vs. shadcn:** React Aria é mais robusto em a11y e não depende de React 19, mas exige construir a camada visual do zero (mais trabalho de design + testes); shadcn entrega componentes prontos, mas com o risco React 18 em aberto.

### 8.3 Demais bibliotecas ⚠️ análise do pesquisador

- **Radix UI (primitives):** base do shadcn; usável direto, headless, compatível com qualquer CSS. Alternativa se o shadcn travar no React 18 — Radix primitives suportam React 18.
- **MUI / Ant Design / Chakra / Mantine:** todas carregam **runtime de estilo próprio** (Emotion/CSS-in-JS ou CSS próprio) que conflita com o modelo "100% Tailwind CSS-first" do projeto. 🔧 **Desaconselhadas** — adotar qualquer uma significa manter dois sistemas de estilização.
- **Tabler:** é um tema Bootstrap/HTML — incompatível com a direção (e o Bootstrap está sendo removido).

🔧 **Recomendação técnica (ranking, atualizado pós-rodada 2):** 1º **shadcn/ui com upgrade prévio React 18→19** (o caminho TW4+React18 está confirmado como quebrado para refs; o upgrade é a solução limpa) → 2º **Radix primitives puros** estilizados com os tokens próprios (se o upgrade React 19 for vetado) → 3º **React Aria Components** se a11y for elevada a critério dominante. Em todos os casos, variants `data-*` (nativas do Tailwind 4 ou via plugin) para estados.

## 9. Diretrizes de UX

1. **Competência como eixo:** seletor de mês persistente e proeminente em todas as telas (padrão já existente — formalizar posição, atalhos ← →, e "voltar para o mês atual").
2. **Settlement como cidadão de primeira classe:** card "quem deve a quem" com direção visual explícita e ação de registrar acerto (invariantes do Splitwise como microcopy de confiança). ✅ base verificada.
3. **Orçamento legível de relance:** barra de progresso + valores Budgeted/Spent/Balance (padrão Actual ✅) — cor comunica estado (ok/atenção/estourado), número comunica magnitude.
4. **Registro de despesa em ≤ 3 interações a partir de qualquer tela** (FAB/botão global "Nova despesa") — é a ação mais frequente do produto.
5. **Preservar UX-01–UX-08 do RULES.md** (confirmação de exclusão, badges de urgência, pré-seleção em compartilhada etc.) — são regras, não estética.
6. **pt-BR 100%**, incluindo estados ("Carregando…", "Nenhuma despesa neste mês") — corrigir o débito de idioma misto como parte do redesign.

## 10. Diretrizes de UI

- 🔷 Definir **escala tipográfica** (hoje só `font-sans`): 5-6 tamanhos com papéis (display para valores monetários, heading, body, caption/label).
- 🔷 **Valores monetários como elemento visual central** — o padrão já usado no ExpenseModal (valor grande no topo) está alinhado ao mercado; estender ao Dashboard.
- 🔷 Cores de feedback financeiro consistentes: uma única cor para "positivo/receita", uma para "negativo/estouro", uma para "atenção" — hoje emerald/rose/orange são usados inline; promover a tokens semânticos.
- 🔷 Unificar raio (`rounded-lg` vs `rounded-xl`), sombras e espaçamentos numa escala documentada.
- 🔧 Nenhum valor de cor/espaço inline após a migração: só tokens.

## 11. Diretrizes de acessibilidade

✅ **Padrão APG de dialog modal confirmado na fonte (rodada 2, [w3.org/WAI/ARIA/apg/patterns/dialog-modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)):** focus trap ("Tab and Shift + Tab do not move focus outside the dialog"), Escape fecha, retorno de foco ao acionador (regra geral, com exceções documentadas), foco inicial dependente do conteúdo ("DO NOT make the element with role dialog focusable!"). Nuance apurada: o nome acessível pode vir de `aria-labelledby` **ou** `aria-label` — o padrão aceita ambos.

1. **Modais (14 componentes — prioridade nº 1):** focus trap, `Escape` fecha, `role="dialog"` + `aria-modal="true"` + nome via `aria-labelledby` (título visível) ou `aria-label`, foco inicial dependente do conteúdo (primeiro input em formulários), e **retorno do foco ao elemento acionador ao fechar**. Adotar primitive pronta (Radix Dialog / React Aria) em vez de implementar à mão.
2. **Contraste WCAG 2.2 AA:** 4.5:1 texto normal, 3:1 texto grande e componentes de UI — validar a paleta nova inteira em dark **e** light; manter a disciplina já existente dos comentários AA em `index.css`.
3. **Gráfico donut:** manter `role="img"` + `aria-label`, e adicionar alternativa textual/tabular dos dados; não depender só de cor para distinguir categorias (padrões/rótulos diretos).
4. **Teclado global:** ordem de foco lógica, `focus-visible` em todos os interativos, skip-link para o conteúdo principal (relevante com sidebar).
5. **Testes:** estender os testes axe existentes (modal-a11y, home) para todas as rotas + testes de teclado nos modais — os gates de cobertura já dão a infraestrutura.

## 12. Diretrizes de responsividade

✅ O comportamento do Sidebar do shadcn/ui foi confirmado na doc oficial (rodada 2, [ui.shadcn.com/docs/components/sidebar](https://ui.shadcn.com/docs/components/sidebar)): largura padrão `16rem` desktop / `18rem` mobile (constantes ou CSS vars `--sidebar-width`); **visão mobile renderizada como Sheet off-canvas** com estado `openMobile`/`isMobile` via hook `useSidebar`; composable (Provider/Header/Content/Footer/Menu), modos de colapso `offcanvas`/`icon`/`none` e variantes `sidebar`/`floating`/`inset`. Diretrizes:

1. **Sidebar → drawer off-canvas abaixo de `lg`** (hambúrguer no header), sidebar fixa/colapsável (modo ícone) no desktop. O Sidebar do shadcn/ui implementa exatamente isso ✅ — e os 16rem padrão coincidem com os 256px atuais do HF.
2. **Tabelas → cards/listas empilhadas em telas pequenas** (Despesas, Contas a Pagar): cada linha vira um card com hierarquia valor > descrição > metadados. `overflow-x-auto` é paliativo, não solução.
3. **Breakpoints declarados:** definir e documentar a matriz (ex.: base 360px mobile-first, `md` tablet, `lg` desktop com sidebar) — hoje só `md:` é usado de forma sistemática.
4. **Container queries do Tailwind 4** (`@container`) para os cards do Dashboard — o mesmo card se adapta ao slot, não ao viewport; útil na grade de 3 colunas que vira 1.
5. **Alvos de toque ≥ 44px** nas ações de linha (editar/excluir) no mobile.
6. **Gate de teste:** adicionar projetos Playwright com viewport 360px (smoke por rota) para o requisito virar critério verificável.

## 13. Sugestão de direção visual 🔷 (para o Claude Design decidir — não é decisão final)

- **Ponto de partida:** o dark azul atual (`#137fec` sobre `#101922`) é competente e tem disciplina de contraste; a pesquisa não encontrou razão para descartá-lo — a decisão é de identidade, não técnica.
- **Caminhos possíveis:** (a) evoluir a paleta atual para uma escala completa dark+light em OKLCH (alinhado ao shadcn ✅); (b) nova identidade fintech pt-BR (referências Nubank/Monarch/Copilot — convenções pt-BR validadas no §5.6 ✅; moodboard visual com screenshots segue recomendado).
- **Invariantes em qualquer caminho:** tema claro E escuro via `prefers-color-scheme` + toggle; semântica financeira de cor consistente (§10); contraste AA verificado por token.

## 14. Sugestão de Design System

🔧 **Formalizar um DS próprio e enxuto ("HF Design System") sobre infraestrutura de terceiros**, em vez de adotar um DS público inteiro:

- **Tokens:** próprios, em `@theme` do Tailwind 4 (fonte da verdade no CSS), com nomenclatura semântica inspirada no Primer.
- **Primitives de comportamento:** Radix/shadcn (condicionado ao §8.1) ou React Aria — nunca reimplementar focus trap/teclado à mão.
- **Componentes:** os ~20 existentes reorganizados em 3 camadas — *primitives* (Button, Input, Dialog, Table), *padrões* (Modal de formulário, Card de métrica, EmptyState, Skeleton), *telas*.
- **Documentação:** `DESIGN_SYSTEM.md` no repo (tokens, componentes, variantes, estados, exemplos de uso) — Storybook é opcional/futuro; para 1 dev + agentes, markdown versionado é suficiente. ❓ Hipótese: Storybook só se o projeto ganhar mais contribuidores.

## 15. Sugestão de tokens iniciais 🔧

Estrutura em duas camadas no `@theme` (padrão consolidado; formato W3C DTCG ⚠️ atingiu primeira versão estável — usar como referência de nomenclatura, sem tooling extra por ora):

```css
@theme {
  /* Camada 1 — primitivas (escalas brutas, OKLCH) */
  --color-blue-500: oklch(...);   /* ... escalas de blue, gray, green, red, amber */

  /* Camada 2 — semânticos (o que os componentes consomem) */
  --color-background: ...;        --color-surface: ...;      --color-surface-raised: ...;
  --color-border: ...;            --color-border-strong: ...;
  --color-text: ...;              --color-text-muted: ...;   --color-text-on-primary: ...;
  --color-primary: ...;           --color-primary-hover: ...;
  --color-positive: ...;          /* receitas, saldo ok  (hoje: emerald inline) */
  --color-negative: ...;          /* estouro, delete     (hoje: rose inline)   */
  --color-warning: ...;           /* atenção orçamento   (hoje: orange inline) */
  --color-info: ...;              --color-shared: ...;       /* despesa compartilhada (hoje: purple) */

  /* Tipografia, raio, sombra, espaçamento, motion */
  --font-sans: ...;  --text-display: ...;  --radius-md: ...;  --radius-lg: ...;
  --shadow-card: ...;  --ease-standard: ...;
}
```

Dark/light: semânticos redefinidos por tema (via `@media (prefers-color-scheme)` + classe para override manual); primitivas fixas. Os 10 tokens atuais mapeiam 1-para-1 para semânticos (ex.: `--color-surface-dark` → `--color-surface` no tema dark).

## 16. Componentes prioritários (ordem de migração)

1. **Dialog/Modal base** (destrava os 14 modais; maior ganho de a11y) → 2. **Button** (variantes primary/secondary/ghost/destructive) → 3. **Input/Select/campo monetário** → 4. **Sidebar responsiva** (drawer mobile) → 5. **Table/lista responsiva** (tabela→cards) → 6. **Skeleton + EmptyState + ErrorState unificados** → 7. **Card de métrica** (BalanceCards, FamilyVision) → 8. **Toast** (sonner mantido ✅ — shadcn deprecou o próprio toast em favor dele).

## 17. Fluxos prioritários

1. **Registrar despesa** (mais frequente; modal + compartilhamento) · 2. **Dashboard mensal** (leitura de relance + settlement) · 3. **Orçamentos** (progresso por categoria, referência Actual ✅) · 4. **Contas a pagar** (urgência/atraso) · 5. **Troca de competência** (transversal). Login e Metas: ❓ escopo a decidir (perguntas abertas do prep).

## 18. Critérios de aceite do redesign

- [ ] Nenhuma cor/espaçamento/raio inline fora de tokens (`grep` sem hex/valores mágicos em componentes).
- [ ] Todas as 6 rotas funcionais e legíveis em viewport 360px (Playwright viewport test).
- [ ] Todos os modais: focus trap, Escape, `aria-modal`, retorno de foco ao acionador (testes de teclado + axe) — critérios confirmados no APG ✅ (§11).
- [ ] Contraste AA verificado para todos os pares texto/fundo em ambos os temas.
- [ ] Tema claro e escuro funcionais, respeitando `prefers-color-scheme`.
- [ ] UI 100% pt-BR (auditoria de strings).
- [ ] Estados loading (skeleton), empty, error (com retry) padronizados em toda tela que consome API.
- [ ] Gates de teste existentes (80%/90%, lint, typecheck, build, e2e) verdes ao fim de cada etapa incremental.
- [ ] UX-01–UX-08 do RULES.md preservados.
- [ ] Bootstrap removido do package.json.

## 19. Riscos e mitigação

| Risco | Evidência | Mitigação |
|---|---|---|
| **shadcn/ui exige React 19** (confirmado ✅) | React 18 + ref-como-prop = refs `null` silenciosos ([react.dev](https://react.dev/blog/2024/12/05/react-19), [issue #6739](https://github.com/shadcn-ui/ui/issues/6739)); estilo legado é Tailwind v3, incompatível com o projeto | **Upgrade React 18→19 como pré-tarefa** (recomendado); alternativa: Radix puro ou re-adicionar `forwardRef` manualmente |
| **Quebrar gates de cobertura** ao reescrever componentes | Gates 80%/90% ativos | Migração incremental componente-a-componente, testes migrados junto (copy-paste do shadcn deixa o código testável no repo) |
| **Regressão de a11y** | Base atual razoável (axe em modais) | Primitives prontas (nunca focus trap manual) + axe em todas as rotas antes/depois |
| **Copiar código/markup do Maybe Finance** | AGPL-3.0 copyleft forte (§6 ✅) | Usar apenas como referência visual; nunca copiar código/markup |
| **Redesign sem decisão de tokens primeiro** | Problema atual (valores inline) | Ordem obrigatória: tokens → primitives → padrões → telas |
| **Nova paleta regride contraste / cor como único sinal** | Disciplina AA atual só em comentários; YNAB precisou adicionar ícones além da cor (§5.3 ✅) | Contraste como critério de aceite por token; estado de orçamento sempre cor + ícone/texto |

*(Risco de "cobertura de pesquisa estreita" da rodada 1 foi resolvido pela rodada 2: todos os claims pendentes confirmados e lacunas de benchmark preenchidas com fontes primárias.)*

## 20. Recomendações para Claude Design

Entregar ao Claude Design: este documento + [deep-research-prep.md](deep-research-prep.md) + screenshots das 6 telas atuais + tokens de `src/index.css` + regras UX-01–UX-08 + restrições do CLAUDE.md. Pedir:

1. **Direção visual** (2-3 propostas: evolução do dark azul vs. nova identidade), cada uma com paleta dark+light já anotada com razões de contraste.
2. **Tokens completos** no formato do §15 (nomes semânticos prontos para `@theme`).
3. **Specs por tela** dos 5 fluxos do §17, em 360px e desktop, incluindo estados (loading/empty/error).
4. **Anatomia dos componentes prioritários** (§16) com variantes e estados (hover/focus/active/disabled).
5. Saída em **`DESIGN.md`** (direção, princípios, layouts) + **`DESIGN_SYSTEM.md`** (tokens, componentes, variantes, estados) — markdown versionável, consumível pelo Claude Code.

## 21. Recomendações para Claude Code (implementação futura)

1. **Pré-tarefas:** remover Bootstrap; **upgrade React 18→19** (pré-requisito confirmado para shadcn/ui, §8.1); passe de i18n pt-BR usando a terminologia validada do §5.6 (barato, independe do design).
2. **Ordem:** tokens (`@theme` novo, mapeando os 10 atuais) → Dialog base + migração dos 14 modais → Button/Input → Sidebar responsiva → tabelas→cards → estados unificados → telas.
3. **Cada etapa = 1 ticket HF** com gates verdes (lint, typecheck, coverage, e2e, docs-guard) — nunca big-bang.
4. **Novos testes:** Playwright viewport 360px por rota; testes de teclado nos modais; axe em todas as rotas.
5. Estados de interação via variants `data-*` (nativas do Tailwind 4 ou plugin `tailwindcss-react-aria-components` ✅ se React Aria for adotado).

## 22. Fontes e referências utilizadas

**Primárias verificadas (claims confirmados):**
- https://blog.splitwise.com/2012/09/14/debts-made-simple/ · https://feedback.splitwise.com/knowledgebase/articles/107220 — settlement ✅
- https://github.com/actualbudget/actual · https://actualbudget.org/docs/getting-started/envelope-budgeting/ — Actual Budget ✅
- https://ui.shadcn.com/docs/tailwind-v4 · https://ui.shadcn.com/docs/changelog/2025-02-tailwind-v4 — shadcn × Tailwind 4 ✅
- https://www.npmjs.com/package/tailwindcss-react-aria-components · https://github.com/adobe/react-spectrum — plugin React Aria ✅

**Primárias verificadas na rodada 2 (✅):**
- https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ (+ [exemplo](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/)) — padrão APG de dialog
- https://react-spectrum.adobe.com/react-aria/styling.html · https://react-spectrum.adobe.com/react-aria/useDialog.html — React Aria headless, data attributes, plugin, focus management
- https://ui.shadcn.com/docs/components/sidebar — sidebar responsiva (Sheet mobile, useSidebar)
- https://ui.shadcn.com/docs/tailwind-v4 · https://github.com/shadcn-ui/ui/issues/6739 · https://github.com/shadcn-ui/ui/issues/8990 · https://react.dev/blog/2024/12/05/react-19 — shadcn × React 18/19
- Suporte oficial YNAB (assigning, auto-assign, colors-and-icons, overspending) · Monarch (couples, flex budgeting) · Copilot (intelligence, rebalancing, budgets by month, categories)
- Nubank (blog oficial fatura) · Mobills (zendesk planejamento mensal, blog) · Organizze (central de ajuda, site)
- https://github.com/maybe-finance/maybe (+ release v0.6.0, API GitHub — arquivado, AGPL-3.0, Rails/Hotwire) · https://github.com/we-promise/sure
- https://primer.style/foundations/color/overview/ · https://primer.style/product/primitives/token-names/ — tokens Primer
- https://polaris-react.shopify.com/components/layout-and-structure/empty-state · .../form-layout · .../patterns — Polaris
- https://m3.material.io/foundations/interaction/states/state-layers · https://m3.material.io/styles/color/roles — Material 3

**Primárias consultadas, verificação pendente (⚠️):**
- https://tailwindcss.com/docs/theme — `@theme` Tailwind 4
- https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/ — DTCG estável
- https://webaim.org/articles/contrast/ — contraste
- https://www.anthropic.com/news/claude-design-anthropic-labs — Claude Design

**Secundárias/blogs (contexto, menor peso):** Smashing Magazine (tabelas responsivas acessíveis; gráficos acessíveis), sitepoint (container queries TW4), shadcnblocks (theming TW4), uxdesign.cc (case Splitwise), maviklabs (tokens TW4 2026), designsystemscollective/claudefa.st (handoff design→código), reviews de produto (Forbes, envelopebudgeting, productivewithchris, racheleditullio — a11y YNAB).

---

## Briefing pronto para Claude Design

> **Produto:** Home Finance — app web de finanças domésticas para um casal com filhos. 6 telas (Dashboard, Despesas, Receitas, Orçamentos, Contas a Pagar, Configurações), ciclo mensal por "competência", divisão de despesas com settlement entre o casal, orçamento por categoria com alertas.
>
> **Tarefa:** propor direção visual e Design System completos, sem implementar código.
>
> **Restrições técnicas (inegociáveis):** React 19 (upgrade a partir do 18 é pré-tarefa confirmada, se shadcn/ui for adotado) + Tailwind CSS 4 CSS-first — todos os tokens devem ser expressos como CSS variables em `@theme`; ícones lucide-react; toasts sonner; interface 100% pt-BR (terminologia validada: "despesas"/"receitas", "lançamentos", "fatura"/"limite disponível" para cartão, "Orçamento" = teto mensal, "Meta" = objetivo de redução; tom de voz humano estilo Nubank); responsivo de 360px a desktop; WCAG 2.2 AA (contraste anotado por token; estado nunca só por cor — cor + ícone/texto); regras UX-01–UX-08 do RULES.md preservadas; nenhuma regra de negócio na UI.
>
> **Ponto de partida visual:** dark mode azul (`#137fec` sobre `#101922`, superfícies `#192633`) com disciplina AA existente. Decidir: evoluir esta identidade ou propor nova — em ambos os casos entregar tema dark **e** light em OKLCH.
>
> **Referências validadas:** Actual Budget (UI de orçamento Budgeted/Spent/Balance, navegação mensal); Splitwise (settlement com garantias comunicadas ao usuário); YNAB ("planejado" e "disponível" sempre visíveis; cor+ícone por estado de categoria); Monarch (modelo household de casal — um dashboard, visão por pessoa; resumo fixo vs. variável); Copilot (polish visual; orçamento mensal com herança + realocação); Nubank/Mobills/Organizze (convenções pt-BR: toggle olho no saldo, saldo atual vs. previsto, barra de progresso com alerta de teto, FAB de nova despesa); Maybe Finance (referência visual de dashboard — só inspiração, AGPL); Polaris (anatomia de páginas/formulários/empty states); Primer (nomenclatura de tokens semânticos fg/bg/border + muted/emphasis); Material 3 (state layers para hover/focus/pressed; dark theme por color roles).
>
> **Entregáveis:** (1) 2-3 direções visuais com paleta dark+light e razões de contraste; (2) tokens semânticos completos (cor, tipografia, espaçamento, raio, sombra, motion) prontos para `@theme`; (3) specs das 6 telas em 360px e desktop com estados loading/empty/error; (4) anatomia e estados (hover/focus/active/disabled) dos componentes prioritários: Dialog/Modal, Button, Input/campo monetário, Sidebar responsiva (drawer no mobile), Tabela→cards, Skeleton/EmptyState/ErrorState, Card de métrica; (5) tudo consolidado em `DESIGN.md` + `DESIGN_SYSTEM.md` versionáveis, consumíveis pelo Claude Code para implementação incremental.
>
> **Decisões pendentes do usuário antes de iniciar:** manter identidade azul ou propor nova? Tela de login e Metas entram no escopo? Prioridade mobile vs. desktop? Aprovar o upgrade React 18→19 (pré-requisito do caminho shadcn/ui)?
