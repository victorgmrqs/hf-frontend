# RULES.md - Regras de Negócio

> **Fonte de verdade**: [Confluence — Home Finance / Regras de Negócio](${HF_JIRA_URL}/wiki/spaces/HF/pages/20283394/Regras+de+Neg+cio)
> Este arquivo é um espelho local dos domínios consumidos pelo hf-frontend (USR/DSP/FPG/CAT/PER/CAL/MET/CTP, do hf-transaction-service) mais o domínio UX, exclusivo deste repositório. Em caso de divergência, o Confluence prevalece — exceto para UX, que só existe aqui.
> Ao alterar ou adicionar uma regra no código, atualize **ambos**: o Confluence e este arquivo.
> Sincronizado com o backend em 2026-07-22 (achado: DSP-10/11/12 e MET-03 estavam desatualizados aqui).

## Visão Geral
Gerenciador financeiro doméstico para casal com filhos. Permite controlar despesas pessoais e compartilhadas, com cálculo automático de divisão.

---

## 1. Usuários

| Regra | Descrição | Status |
|-------|-----------|--------|
| USR-01 | O sistema suporta múltiplos usuários (mínimo 2 para uso completo) | ✅ Implementado |
| USR-02 | Cada usuário possui despesas pessoais e pode participar de despesas compartilhadas | ✅ Implementado |
| USR-03 | Usuário deve estar vinculado a pelo menos uma forma de pagamento | ✅ Implementado |
| USR-04 | Email do usuário deve ser único no sistema | ✅ Implementado |
| USR-05 | Usuário pode estar inativo; usuários inativos não podem efetuar operações | ✅ Implementado |
| USR-06 | Não é possível excluir um usuário que possua despesas vinculadas | ✅ Implementado |

---

## 2. Despesas

| Regra | Descrição | Status |
|-------|-----------|--------|
| DSP-01 | Toda despesa possui: descrição, valor, data, competência, tipo, usuário responsável, forma de pagamento | ✅ Implementado |
| DSP-02 | Despesa pode ser **pessoal** (1 usuário) ou **compartilhada** (≥2 usuários) | ✅ Implementado |
| DSP-03 | Despesa compartilhada é dividida entre os usuários vinculados — igualmente por padrão, ou por percentual customizado (ver DSP-10) | ✅ Implementado |
| DSP-04 | Categoria é **opcional** e pode ser adicionada/alterada posteriormente | ✅ Implementado |
| DSP-05 | Despesas de filhos (escola, roupas, passeios) são tratadas como compartilhadas entre os pais | ✅ Implementado |
| DSP-06 | Despesa compartilhada exige o vínculo de **no mínimo 2 usuários** — aplica-se na criação e na edição | ✅ Implementado |
| DSP-07 | O usuário pagador (`user_id`) deve estar obrigatoriamente incluído na lista de compartilhamento (`shared_user_ids`) — aplica-se na criação e na edição | ✅ Implementado |
| DSP-08 | Ao atualizar uma despesa compartilhada, os participantes anteriores são substituídos pelos novos `shared_user_ids` informados | ✅ Implementado |
| DSP-09 | Ao converter uma despesa de compartilhada para pessoal, todos os registros de compartilhamento são removidos | ✅ Implementado |
| DSP-10 | Despesa compartilhada aceita rateio percentual variável: `shared_user_ids` pode ser array de objetos `{user_id, split_pct}`, mantendo retrocompatibilidade com array de strings (rateio igualitário). `split_pct` deve estar em `(0,100]` e ser informado para todos os participantes ou nenhum | ✅ Implementado (HF-48) |
| DSP-11 | Quando os percentuais não são informados, o rateio é igualitário entre os participantes (padrão) | ✅ Implementado (HF-48) |
| DSP-12 | A soma dos `split_pct` informados deve ser exatamente 100 | ✅ Implementado (HF-48) |

### Tipos de Despesa

| Valor | Descrição |
|-------|-----------|
| `PERSONAL` | Despesa de responsabilidade de 1 usuário |
| `SHARED` | Despesa dividida entre ≥2 usuários |
| `CHILD` | Despesa de filho — tratada como SHARED entre os pais |
| `HOME` | Despesa doméstica compartilhada |
| `OTHER` | Outros tipos |

---

## 3. Formas de Pagamento

| Regra | Descrição | Status |
|-------|-----------|--------|
| FPG-01 | Tipos suportados: `CREDIT_CARD`, `DEBIT_CARD`, `BANK_ACCOUNT`, `CASH`, `PIX`, `OTHER` | ✅ Implementado |
| FPG-02 | Pode ser **pessoal** (exatamente 1 usuário) ou **compartilhada** (≥2 usuários) | ✅ Implementado |
| FPG-03 | Forma de pagamento compartilhada exige **mínimo 2 usuários** vinculados | ✅ Implementado |
| FPG-04 | Forma de pagamento só é visível para os usuários vinculados a ela | ✅ Implementado |
| FPG-05 | Não é possível excluir forma de pagamento com despesas vinculadas | ✅ Implementado |
| FPG-06 | Forma de pagamento pessoal exige **exatamente 1 usuário** | ✅ Implementado |
| FPG-07 | Não é possível adicionar um usuário já vinculado à forma de pagamento | ✅ Implementado |
| FPG-08 | Não é possível remover o último usuário de uma forma de pagamento | ✅ Implementado |
| FPG-09 | Ao remover usuário de forma de pagamento compartilhada, devem restar no mínimo 2 usuários | ✅ Implementado |

---

## 4. Categorias

| Regra | Descrição | Status |
|-------|-----------|--------|
| CAT-01 | Categoria é **opcional** na criação da despesa | ✅ Implementado |
| CAT-02 | Categoria pode ser adicionada ou alterada a qualquer momento via endpoint específico | ✅ Implementado |
| CAT-03 | Exemplos: Alimentação, Transporte, Educação, Lazer, Saúde, Moradia | ✅ Implementado |
| CAT-04 | Uma categoria pode ser **Global** (`user_id` NULL) ou **Privada** (vinculada a um usuário) | 📅 Planejado |
| CAT-05 | Nome de categoria deve ser único no sistema | ✅ Implementado |
| CAT-06 | Categoria pode ser desativada (flag `Active`) sem ser excluída | ✅ Implementado |
| CAT-07 | Não é possível excluir uma categoria com despesas vinculadas | ✅ Implementado |

---

## 5. Período e Fechamento

| Regra | Descrição | Status |
|-------|-----------|--------|
| PER-01 | Período de referência é **mensal** (mês/ano) | ✅ Implementado |
| PER-02 | Toda despesa deve ter uma competência no formato `YYYY-MM` | ✅ Implementado |
| PER-03 | Relatórios e totais são calculados por competência mensal | ✅ Implementado |

---

## 6. Cálculos

| Regra | Descrição | Status |
|-------|-----------|--------|
| CAL-01 | **Total do usuário** = soma despesas pessoais + (soma despesas compartilhadas ÷ nº usuários vinculados) | ✅ Implementado |
| CAL-02 | Divisão de despesa compartilhada: `valor ÷ quantidade de usuários vinculados` (ou por percentual, ver DSP-10) | ✅ Implementado |
| CAL-03 | Totais devem ser calculados por competência (mês/ano) | ✅ Implementado |
| CAL-04 | A divisão arredonda cada parcela a 2 casas decimais e distribui a sobra de centavos aos primeiros participantes, sem perda de centavo | ✅ Implementado |
| CAL-05 | Total por categoria (na competência) = despesas pessoais + parte do usuário nas compartilhadas, agrupado por categoria; percentual sobre o total geral do usuário | ✅ Implementado |

---

## 7. Orçamentos e Metas

| Regra | Descrição | Status |
|-------|-----------|--------|
| MET-01 | Usuário pode definir orçamento mensal por categoria | ✅ Implementado |
| MET-02 | Sistema permite consultar status do orçamento (gasto vs. limite por competência) | ✅ Implementado |
| MET-03 | Sistema alerta visualmente quando gastos atingem percentual configurável do orçamento da categoria (padrão 80%, campo `alert_threshold`, intervalo 1–100); exibe em vermelho quando o limite é excedido | ✅ Implementado (HF-12) |

> Não confundir com o épico Jira "Metas de Redução de Gastos" (HF-34, `hf-income-service`, `ReductionGoal`, MET-04 a MET-07) — domínio distinto, entregue no backend (HF-68/69/70/71) e consumido pela seção "Metas de Redução" da página Budgets (HF-47).

---

## 8. Contas a Pagar

| Regra | Descrição | Status |
|-------|-----------|--------|
| CTP-01 | Contas a pagar possuem: descrição, valor, data de vencimento, recorrência | ✅ Implementado |
| CTP-02 | Vencimentos podem ser agrupados por dia-chave (ex: dia 5, 10, 20) | ✅ Implementado |
| CTP-03 | Visualização: "O que preciso pagar até o dia X" | ✅ Implementado |
| CTP-04 | Conta marcada como paga gera automaticamente uma despesa vinculada | ✅ Implementado |
| CTP-05 | Status possíveis: `PENDING` (padrão na criação) e `PAID` | ✅ Implementado |
| CTP-06 | Recorrência automática de contas a pagar | 📅 Planejado |

---

## 9. Experiência do Usuário

> Domínio exclusivo do hf-frontend — sem equivalente no backend/Confluence cross-repo.

| Regra | Descrição |
|-------|-----------|
| UX-01 | Toda ação destrutiva (exclusão) exige confirmação explícita via modal antes de ser executada |
| UX-02 | Toda ação (criação, edição, exclusão) fornece feedback imediato via toast notification |
| UX-03 | Quando uma lista está vazia, o sistema exibe mensagem orientadora e botão de ação contextual (CTA) |
| UX-04 | A rota ativa é destacada visualmente na Sidebar para orientar a navegação |
| UX-05 | Competência é sempre exibida em formato legível "Mês/Ano" (ex: "Junho/2026") em vez do formato ISO |
| UX-06 | Ao ativar tipo "Compartilhada" no formulário de despesa, todos os usuários da família são pré-selecionados automaticamente |
| UX-07 | Erros de validação são exibidos inline abaixo de cada campo inválido, sem depender de alertas genéricos |
| UX-08 | Contas com vencimento próximo exibem badge de urgência na Sidebar como alerta passivo |

---

## Glossário

| Termo | Definição |
|-------|-----------|
| Despesa pessoal | Gasto de responsabilidade de apenas 1 usuário |
| Despesa compartilhada | Gasto dividido entre 2+ usuários (igual ou por percentual) |
| Competência | Mês/ano de referência da despesa (formato `YYYY-MM`) |
| Forma de pagamento | Meio utilizado para o pagamento (cartão, conta, pix) |
| split_pct | Percentual de rateio de um participante em despesa compartilhada (DSP-10) |
