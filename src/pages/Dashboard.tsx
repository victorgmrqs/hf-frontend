import React, { useState, useEffect } from 'react';
import { 
  Plus,
  CalendarDays,
  User as UserIcon,
  CheckCircle,
  ShoppingCart,
  Car,
  Tv,
  Home,
  Clock,
  AlertCircle,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import ExpenseModal from '../components/ExpenseModal';
import Sidebar from '../components/Sidebar';
import { financeService, Expense, AccountPayable } from '../services/financeService';
import { useUser } from '../hooks/useUser';
import { useCompetences } from '../hooks/useCompetence';

const Dashboard: React.FC = () => {
  const { currentUser, allUsers } = useUser();
  const { availableCompetences, refreshCompetences } = useCompetences();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totals, setTotals] = useState({ total_personal: 0, total_shared: 0, total_general: 0 });
  const [budgets, setBudgets] = useState<{ category_name: string; amount: number; current_spending: number }[]>([]);
  const [upcomingAccounts, setUpcomingAccounts] = useState<AccountPayable[]>([]);
  const [competence, setCompetence] = useState(new Date().toISOString().substring(0, 7));
  const [loading, setLoading] = useState(true);

  // Settlement state
  const [settlement, setSettlement] = useState({
    paid_by_me: 0,
    my_responsibility: 0,
    others_owe_me: 0,
    i_owe_others: 0,
    balance: 0
  });

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [competence, currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [expensesRes, totalsRes, budgetsRes, accountsRes] = await Promise.all([
        financeService.getExpenses(currentUser.id, competence),
        financeService.getTotals(currentUser.id, competence),
        financeService.getBudgetStatus(currentUser.id, competence),
        financeService.getAccountsPayable(currentUser.id, 'PENDING')
      ]);

      if (expensesRes.data) {
        setExpenses(expensesRes.data);
        calculateSettlement(expensesRes.data, totalsRes.data?.total_general || 0);
      }
      if (totalsRes.data) setTotals(totalsRes.data);
      if (budgetsRes.data) setBudgets(budgetsRes.data);
      if (accountsRes.data) {
        const sorted = [...accountsRes.data]
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
          .slice(0, 3);
        setUpcomingAccounts(sorted);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSettlement = (userExpenses: Expense[], totalGeneral: number) => {
    if (!currentUser) return;

    // 1. Total que EU paguei efetivamente (saída de caixa da minha conta pessoal/cartão pessoal)
    // Nota: Despesas pagas com método compartilhado não contam como desembolso individual total
    const paidByMe = userExpenses
      .filter(exp => exp.user_id === currentUser.id && !exp.payment_method.shared)
      .reduce((acc, exp) => acc + Number(exp.value), 0);

    // 2. Minha responsabilidade real (Pessoais + Minha parte do compartilhado)
    const myResponsibility = Number(totalGeneral);

    // 3. Quanto os outros me devem (Eu paguei integral com meu cartão pessoal e eles devem a parte deles)
    const othersOweMe = userExpenses
      .filter(exp => exp.type === 'SHARED' && exp.user_id === currentUser.id && !exp.payment_method.shared)
      .reduce((acc, exp) => {
        const val = Number(exp.value);
        const myParticipant = exp.shared_with?.find(p => p.user_id === currentUser.id);
        const myPortion = myParticipant ? myParticipant.divided_amount : (val / (exp.shared_with?.length || 1));
        return acc + (val - myPortion);
      }, 0);

    // 4. Quanto eu devo aos outros (Eles pagaram integral com o cartão pessoal deles e eu devo minha parte)
    const iOweOthers = userExpenses
      .filter(exp => exp.type === 'SHARED' && exp.user_id !== currentUser.id && !exp.payment_method.shared)
      .reduce((acc, exp) => {
        const myParticipant = exp.shared_with?.find(p => p.user_id === currentUser.id);
        return acc + (myParticipant ? myParticipant.divided_amount : 0);
      }, 0);
    
    setSettlement({
      paid_by_me: paidByMe,
      my_responsibility: myResponsibility,
      others_owe_me: othersOweMe,
      i_owe_others: iOweOthers,
      balance: othersOweMe - iOweOthers
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const getCategoryIcon = (categoryName?: string) => {
    switch (categoryName?.toLowerCase()) {
      case 'alimentação':
      case 'food': return <ShoppingCart size={16} />;
      case 'transporte':
      case 'transport': return <Car size={16} />;
      case 'lazer':
      case 'entertainment': return <Tv size={16} />;
      default: return <Home size={16} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background-dark text-white">
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Dashboard Overview</h2>
            <p className="text-text-secondary mt-1">Summary for {competence}</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-secondary">
                <CalendarDays size={18} />
              </div>
              <select 
                value={competence}
                onChange={(e) => setCompetence(e.target.value)}
                className="bg-surface-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary block pl-10 pr-4 py-2.5 appearance-none cursor-pointer"
              >
                {availableCompetences.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              <Plus className="mr-2" size={20} />
              New Expense
            </button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-surface-dark rounded-xl p-6 border border-border-dark/50 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <UserIcon size={64} className="text-primary" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-secondary text-sm font-medium uppercase tracking-wider">Personal Total</h3>
              <span className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded">Monthly</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-white">{formatCurrency(totals.total_personal)}</span>
            </div>
          </div>

          <div className="bg-surface-dark rounded-xl p-6 border border-border-dark/50 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <UserIcon size={64} className="text-purple-400" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-secondary text-sm font-medium uppercase tracking-wider">Shared Total</h3>
              <span className="bg-purple-500/10 text-purple-400 text-xs font-semibold px-2 py-1 rounded">Monthly</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-white">{formatCurrency(totals.total_shared)}</span>
            </div>
          </div>

          <div className="bg-surface-dark rounded-xl p-6 border border-border-dark/50 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <CheckCircle size={64} className="text-emerald-400" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-secondary text-sm font-medium uppercase tracking-wider">General Total</h3>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2 py-1 rounded">Monthly</span>
            </div>
            <div className="flex items-baseline">
              <span className="text-3xl font-bold text-white">{formatCurrency(totals.total_general)}</span>
            </div>
          </div>
        </div>

        {/* Settlement & Detailed Totals */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
          <div className="xl:col-span-2 bg-surface-dark rounded-xl border border-border-dark/50 shadow-sm p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <ArrowRightLeft size={120} className="text-primary" />
            </div>
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <ArrowRightLeft size={24} />
              </div>
              <h3 className="font-bold text-xl text-white">Monthly Settlement</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase font-bold tracking-widest">Total Paid by You</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(settlement.paid_by_me)}</p>
                <p className="text-[10px] text-text-secondary leading-relaxed">Amount that actually left your accounts this month.</p>
              </div>

              <div className="space-y-1">
                <p className="text-text-secondary text-xs uppercase font-bold tracking-widest">Your Responsibility</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(settlement.my_responsibility)}</p>
                <p className="text-[10px] text-text-secondary leading-relaxed">Personal expenses + your part of shared costs.</p>
              </div>

              <div className="bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col justify-center">
                <p className="text-text-secondary text-xs uppercase font-bold tracking-widest mb-1">Final Balance</p>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-black ${settlement.balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(Math.abs(settlement.balance))}
                  </span>
                  {settlement.balance > 0 ? <ArrowUpRight className="text-emerald-400" /> : <ArrowDownLeft className="text-rose-400" />}
                </div>
                <p className={`text-[10px] font-medium mt-1 ${settlement.balance >= 0 ? 'text-emerald-500/80' : 'text-rose-500/80'}`}>
                  {settlement.balance >= 0 
                    ? 'You have credit to receive from others.' 
                    : 'You spent less than your share. You owe others.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-dark rounded-xl border border-border-dark/50 shadow-sm p-6">
            <h3 className="font-bold text-lg text-white mb-4">Breakdown</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">Personal Expenses</span>
                <span className="text-white font-medium">{formatCurrency(totals.total_personal)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">Your Part (Shared)</span>
                <span className="text-white font-medium">{formatCurrency(totals.total_shared)}</span>
              </div>
              <div className="h-px bg-border-dark/50 my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-primary font-bold">Total Responsibility</span>
                <span className="text-primary font-bold text-lg">{formatCurrency(totals.total_general)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Expenses Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-surface-dark rounded-xl border border-border-dark/50 shadow-sm flex flex-col">
            <div className="p-6 border-b border-border-dark flex justify-between items-center">
              <h3 className="font-semibold text-lg text-white">Recent Expenses</h3>
              <a className="text-sm text-primary hover:text-blue-400 font-medium" href="#">View All</a>
            </div>
            <div className="overflow-x-auto flex-1">
              {loading ? (
                <div className="p-10 text-center text-text-secondary">Loading...</div>
              ) : (
                <table className="w-full text-left text-sm text-text-secondary">
                  <thead className="bg-white/5 text-xs uppercase font-medium text-slate-300">
                    <tr>
                      <th className="px-6 py-4">Description</th>
                      <th className="px-6 py-4">Category</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark/50">
                    {expenses.map(expense => (
                      <tr key={expense.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                            {getCategoryIcon(expense.category?.name)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p>{expense.description}</p>
                              {expense.payment_method.shared && (
                                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold uppercase tracking-tighter">
                                  Joint
                                </span>
                              )}
                            </div>
                            {expense.user_id !== currentUser?.id && (
                              <p className="text-[10px] text-purple-400 font-normal">
                                Paid by {allUsers.find(u => u.id === expense.user_id)?.name || 'Other'}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {expense.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right text-white font-medium">{formatCurrency(expense.value)}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-10 text-center">No expenses found for this period.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="bg-surface-dark rounded-xl border border-border-dark/50 shadow-sm p-6 h-fit">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-lg text-white">Budget Status</h3>
              <a className="text-xs text-primary hover:underline" href="/budgets">View All</a>
            </div>
            <div className="space-y-6 mb-8">
              {budgets.length > 0 ? budgets.map((budget, index) => {
                const percentage = Math.min(Math.round((budget.current_spending / budget.amount) * 100), 100);
                const colorClass = percentage > 90 ? 'bg-rose-500' : percentage > 70 ? 'bg-orange-400' : 'bg-primary';
                
                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-300 font-medium">{budget.category_name}</span>
                      <span className="text-text-secondary">
                        {formatCurrency(budget.current_spending)} / <span className="text-slate-500">{formatCurrency(budget.amount)}</span>
                      </span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-2.5">
                      <div className={`${colorClass} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-4 text-text-secondary italic">
                  No budgets set for this period.
                </div>
              )}
            </div>

            <div className="border-t border-border-dark pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-white">Upcoming Payments</h3>
                <a className="text-xs text-primary hover:underline" href="/accounts-payable">Manage</a>
              </div>
              <div className="space-y-3">
                {upcomingAccounts.length > 0 ? upcomingAccounts.map(account => {
                  const isOverdue = new Date(account.due_date) < new Date();
                  return (
                    <div key={account.id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-border-dark/30">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${isOverdue ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                          {isOverdue ? <AlertCircle size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white line-clamp-1">{account.description}</p>
                          <p className={`text-xs ${isOverdue ? 'text-rose-500 font-bold' : 'text-text-secondary'}`}>
                            {new Date(account.due_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white">{formatCurrency(account.amount)}</span>
                    </div>
                  );
                }) : (
                  <div className="text-center py-4 text-text-secondary text-sm italic">
                    No pending payments.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ExpenseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={() => {
          fetchData();
          refreshCompetences();
        }}
      />
    </div>
  );
};

export default Dashboard;
