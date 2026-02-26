import { apiFetch } from './api';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  shared: boolean;
}

export interface Expense {
  id: string;
  description: string;
  value: number;
  date: string;
  competence: string;
  type: string;
  user_id: string;
  category?: Category;
  payment_method: PaymentMethod;
  shared_with?: {
    user_id: string;
    name: string;
    divided_amount: number;
  }[];
}

export interface AccountPayable {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'PENDING' | 'PAID';
  recurrence: string;
  paid_at?: string;
  expense_id?: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  competence: string;
  amount: number;
}

export const financeService = {
  getUsers: () => apiFetch<User[]>('/users'),
  getCategories: () => apiFetch<Category[]>('/categories'),
  getPaymentMethods: (userId: string) => apiFetch<PaymentMethod[]>(`/payment-methods/user/${userId}`),
  getExpenses: (userId: string, competence?: string, type?: string) => {
    const params = new URLSearchParams();
    if (competence) params.append('competence', competence);
    if (type) params.append('type', type);
    const query = params.toString();
    return apiFetch<Expense[]>(`/expenses/user/${userId}${query ? `?${query}` : ''}`);
  },
  getTotals: (userId: string, competence: string) => 
    apiFetch<{ total_personal: number; total_shared: number; total_general: number }>(`/expenses/user/${userId}/totals?competence=${competence}`),
  
  // Budgets
  getBudgets: (userId: string, competence: string) =>
    apiFetch<Budget[]>(`/budgets?user_id=${userId}&competence=${competence}`),
  createBudget: (data: any) => apiFetch<Budget>('/budgets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateBudget: (id: string, requesterId: string, amount: number) =>
    apiFetch<Budget>(`/budgets/${id}?requester_id=${requesterId}`, {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    }),
  deleteBudget: (id: string, requesterId: string) =>
    apiFetch<void>(`/budgets/${id}?requester_id=${requesterId}`, {
      method: 'DELETE',
    }),
  getBudgetStatus: (userId: string, competence: string) =>
    apiFetch<{ id: string; category_name: string; amount: number; current_spending: number }[]>(`/budgets/status?user_id=${userId}&competence=${competence}`),
  
  // Categories
  createCategory: (data: any) => apiFetch<Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updateCategory: (id: string, data: any) => apiFetch<Category>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteCategory: (id: string) => apiFetch<void>(`/categories/${id}`, {
    method: 'DELETE',
  }),

  // Payment Methods
  createPaymentMethod: (data: any) => apiFetch<PaymentMethod>('/payment-methods', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  updatePaymentMethod: (id: string, data: any) => apiFetch<PaymentMethod>(`/payment-methods/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deletePaymentMethod: (id: string, requesterId: string) => apiFetch<void>(`/payment-methods/${id}?requester_id=${requesterId}`, {
    method: 'DELETE',
  }),

  createExpense: (expenseData: any) => apiFetch<Expense>('/expenses', {
    method: 'POST',
    body: JSON.stringify(expenseData),
  }),
  updateExpenseCategory: (id: string, requesterId: string, categoryId: string | null) =>
    apiFetch<Expense>(`/expenses/${id}/category?requester_id=${requesterId}`, {
      method: 'PATCH',
      body: JSON.stringify({ category_id: categoryId }),
    }),
  updateExpense: (id: string, requesterId: string, data: any) =>
    apiFetch<Expense>(`/expenses/${id}?requester_id=${requesterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteExpense: (id: string, requesterId: string) =>
    apiFetch<void>(`/expenses/${id}?requester_id=${requesterId}`, {
      method: 'DELETE',
    }),
  
  // Accounts Payable
  getAccountsPayable: (userId: string, status?: string) => {
    const params = new URLSearchParams();
    params.append('user_id', userId);
    if (status) params.append('status', status);
    return apiFetch<AccountPayable[]>(`/accounts-payable?${params.toString()}`);
  },
  createAccountPayable: (data: any) => apiFetch<AccountPayable>('/accounts-payable', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  payAccountPayable: (id: string, requesterId: string, payData: any) => 
    apiFetch<AccountPayable>(`/accounts-payable/${id}/pay?requester_id=${requesterId}`, {
      method: 'POST',
      body: JSON.stringify(payData),
    }),
  deleteAccountPayable: (id: string, requesterId: string) => 
    apiFetch<void>(`/accounts-payable/${id}?requester_id=${requesterId}`, {
      method: 'DELETE',
    }),
};
