// HF-87: mapeador central de error.code (envelope do backend) → mensagem pt-BR.
// A autoridade das regras é o backend; aqui é apenas apresentação/UX. NUNCA
// expõe message/trace_id/stack do backend ao usuário — só devolve texto do
// catálogo abaixo ou o fallback informado pelo chamador.

/** Fallback genérico quando o chamador não informa um contextual. */
export const DEFAULT_ERROR_MESSAGE = 'Ocorreu um erro. Tente novamente.';

/**
 * Catálogo de error.code → pt-BR. Codes reais emitidos por hf-income-service,
 * hf-transaction-service e pelo gateway (UPSTREAM_*). INTERNAL_SEVER_ERROR é um
 * typo existente no backend (transaction) mapeado defensivamente — ver pendência
 * registrada no ticket para correção no backend.
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // --- Genéricos / validação (ambos os serviços) ---
  MISSING_REQUIRED_FIELD: 'Preencha todos os campos obrigatórios.',
  VALIDATION_ERROR: 'Alguns dados são inválidos. Verifique e tente novamente.',
  INVALID_ID: 'Identificador inválido.',
  INVALID_USER_ID: 'Não foi possível identificar o usuário.',
  INTERNAL_SERVER_ERROR: 'Erro interno no servidor. Tente novamente mais tarde.',
  INTERNAL_SEVER_ERROR: 'Erro interno no servidor. Tente novamente mais tarde.',

  // --- Gateway (upstream) ---
  UPSTREAM_TIMEOUT: 'Serviço temporariamente indisponível. Tente novamente.',
  UPSTREAM_ERROR: 'Resposta inesperada do serviço. Tente novamente.',

  // --- hf-income-service (REC/ORC/SAL/MET) ---
  INVALID_COMPETENCE: 'Competência inválida.',
  INVALID_AMOUNT: 'O valor informado é inválido.',
  INVALID_DATE: 'Data inválida.',
  INVALID_INCOME_TYPE: 'Tipo de receita inválido.',
  INCOME_NOT_FOUND: 'Receita não encontrada.',
  CANNOT_EDIT_PROPAGATED_INCOME: 'Receitas recorrentes propagadas não podem ser editadas.',

  // --- hf-transaction-service (DSP/FPG/CAT/USR/PER) ---
  INVALID_LIMIT: 'Limite de itens inválido.',
  INVALID_OFFSET: 'Paginação inválida.',
  INVALID_CATEGORY_ID: 'Categoria inválida.',
  INVALID_PAYMENT_METHOD_ID: 'Forma de pagamento inválida.',
  INVALID_REQUESTER_ID: 'Não foi possível identificar o solicitante.',
  INVALID_USER_IDS: 'Usuários selecionados inválidos.',
  INVALID_SHARED_USER_IDS: 'Usuários da divisão inválidos.',
  INVALID_SPLIT_PCT: 'Percentual de divisão inválido.',
  INVALID_EDIT_MODE: 'Modo de edição inválido.',
  EXPENSE_NOT_FOUND: 'Despesa não encontrada.',
  CATEGORY_NOT_FOUND: 'Categoria não encontrada.',
  CATEGORY_ALREADY_EXISTS: 'Já existe uma categoria com esse nome.',
  PAYMENT_METHOD_NOT_FOUND: 'Forma de pagamento não encontrada.',
  ACCOUNT_NOT_FOUND: 'Conta não encontrada.',
  BUDGET_NOT_FOUND: 'Orçamento não encontrado.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  EMAIL_ALREADY_EXISTS: 'Já existe um usuário com esse e-mail.',
  CANNOT_EDIT_PAID_ACCOUNT: 'Contas já pagas não podem ser editadas.',
  CANNOT_REMOVE_LAST_USER: 'Não é possível remover o último usuário.',
  PAYER_MUST_BE_IN_SHARED_USERS: 'O pagador deve estar entre os usuários da divisão.',
  SHARED_EXPENSE_REQUIRES_MIN_USERS: 'Despesas compartilhadas exigem pelo menos dois usuários.',
  SHARED_REQUIRES_MIN_USERS: 'Despesas compartilhadas exigem pelo menos dois usuários.',
  SPLIT_PCT_MUST_SUM_TO_100: 'A soma dos percentuais de divisão deve ser 100%.',
  USER_ALREADY_IN_PAYMENT_METHOD: 'Usuário já vinculado a esta forma de pagamento.',
};

/** Lê error.code de um unknown com narrowing seguro (sem lançar). */
function extractCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/**
 * Traduz um erro do envelope da API para uma mensagem pt-BR segura.
 * - error.code conhecido → mensagem do catálogo.
 * - code ausente/desconhecido ou erro de outra forma → `fallback` (contextual,
 *   ex. "Erro ao carregar receitas") ou o genérico padrão.
 * Nunca devolve message/trace_id/stack vindos do backend.
 */
export function messageForError(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string {
  const code = extractCode(error);
  return (code && ERROR_MESSAGES[code]) || fallback;
}
