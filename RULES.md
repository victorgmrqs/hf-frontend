# RULES.md - Regras de Negócio

## Visão Geral
Gerenciador financeiro doméstico para casal com filhos. Permite controlar despesas pessoais e compartilhadas, com cálculo automático de divisão.

---

## 1. Usuários

| Regra | Descrição |
|-------|-----------|
| USR-01 | O sistema suporta múltiplos usuários (mínimo 2 para uso completo) |
| USR-02 | Cada usuário possui despesas pessoais e pode participar de despesas compartilhadas |
| USR-03 | Usuário deve estar vinculado a pelo menos uma forma de pagamento |

---

## 2. Despesas

| Regra | Descrição |
|-------|-----------|
| DSP-01 | Toda despesa possui: descrição, valor, data, usuário responsável, forma de pagamento |
| DSP-02 | Despesa pode ser **pessoal** (1 usuário) ou **compartilhada** (≥2 usuários) |
| DSP-03 | Despesa compartilhada é **sempre dividida igualmente** entre os usuários vinculados |
| DSP-04 | Categoria é **opcional** e pode ser adicionada/alterada posteriormente |
| DSP-05 | Despesas de filhos (escola, roupas, passeios) são tratadas como compartilhadas entre os pais |
| DSP-06 | Despesa compartilhada exige o vínculo de **no mínimo 2 usuários** |
| DSP-07 | O usuário pagador (`user_id`) **deve estar incluído** na lista de compartilhamento (`shared_user_ids`) |

---

## 3. Formas de Pagamento

| Regra | Descrição |
|-------|-----------|
| FPG-01 | Forma de pagamento pode ser: cartão de crédito, cartão de débito, conta corrente, dinheiro, pix |
| FPG-02 | Pode ser **pessoal** (1 usuário) ou **compartilhada** (≥2 usuários) |
| FPG-03 | Forma de pagamento compartilhada exige **mínimo 2 usuários** vinculados |
| FPG-04 | Forma de pagamento só é visível para os usuários vinculados a ela |
| FPG-05 | Não é possível excluir forma de pagamento com despesas vinculadas |

---

## 4. Categorias

| Regra | Descrição |
|-------|-----------|
| CAT-01 | Categoria é **opcional** na criação da despesa |
| CAT-02 | Categoria pode ser adicionada ou alterada a qualquer momento via endpoint específico |
| CAT-03 | Exemplos: Alimentação, Transporte, Educação, Lazer, Saúde, Moradia |
| CAT-04 | Uma categoria pode ser **Global** (user_id NULL) ou **Privada** (vinculada a um usuário) |

---

## 5. Período e Fechamento

| Regra | Descrição |
|-------|-----------|
| PER-01 | Período de referência é **mensal** (mês/ano) |
| PER-02 | Toda despesa deve ter uma competência (mês/ano de referência) |
| PER-03 | Relatórios e totais são calculados por competência mensal |

---

## 6. Cálculos

| Regra | Descrição |
|-------|-----------|
| CAL-01 | **Total do usuário** = soma despesas pessoais + (soma despesas compartilhadas ÷ nº usuários vinculados) |
| CAL-02 | Divisão de despesa compartilhada: `valor ÷ quantidade de usuários vinculados` |
| CAL-03 | Totais devem ser calculados por competência (mês/ano) |

---

## 7. Funcionalidades Futuras (não implementar no MVP)

### 7.1 Metas e Orçamentos
| Regra | Descrição |
|-------|-----------|
| MET-01 | Usuário poderá definir orçamento mensal por categoria |
| MET-02 | Sistema alertará quando gastos atingirem % do orçamento |

### 7.2 Contas a Pagar
| Regra | Descrição |
|-------|-----------|
| CTP-01 | Contas a pagar possuem: descrição, valor, data de vencimento, recorrência |
| CTP-02 | Vencimentos agrupados por dia-chave (ex: dia 5, 10, 20) |
| CTP-03 | Visualização: "O que preciso pagar até o dia X" |
| CTP-04 | Conta paga gera automaticamente uma despesa vinculada |

---

## Glossário

| Termo | Definição |
|-------|-----------|
| Despesa pessoal | Gasto de responsabilidade de apenas 1 usuário |
| Despesa compartilhada | Gasto dividido igualmente entre 2+ usuários |
| Competência | Mês/ano de referência da despesa |
| Forma de pagamento | Meio utilizado para o pagamento (cartão, conta, pix) |