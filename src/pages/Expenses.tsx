import React, { useState, useEffect } from 'react';
import { 
  Plus,
  CalendarDays,
  ShoppingCart,
  Car,
  Tv,
  Home,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ExpenseModal from '../components/ExpenseModal';
import EditCategoryModal from '../components/EditCategoryModal';
import { financeService, Expense } from '../services/financeService';
import { useUser } from '../hooks/useUser';

const Expenses: React.FC = () => {
  const { currentUser, allUsers } = useUser();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [competence, setCompetence] = useState('2026-02');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      fetchExpenses();
    }
  }, [competence, typeFilter, currentUser]);

  const fetchExpenses = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data } = await financeService.getExpenses(currentUser.id, competence, typeFilter || undefined);
      if (data) setExpenses(data);
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, description: string) => {
    if (!currentUser) return;
    if (confirm(`Are you sure you want to delete the expense "${description}"?`)) {
      const { error } = await financeService.deleteExpense(id, currentUser.id);
      if (!error) {
        fetchExpenses();
      } else {
        alert('Error deleting expense: ' + (error.message || 'Unknown error'));
      }
    }
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
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Expenses</h2>
            <p className="text-text-secondary mt-1">Detailed list of your transactions</p>
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
                <option value="2026-02">2026-02</option>
                <option value="2026-01">2026-01</option>
              </select>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg flex items-center font-medium transition-colors shadow-lg shadow-blue-900/20"
            >
              <Plus className="mr-2" size={20} />
              Add Expense
            </button>
          </div>
        </header>

        {/* Filters & Actions Bar */}
        <div className="bg-surface-dark border border-border-dark rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-text-secondary mr-2">
              <Filter size={16} />
              <span>Filter by:</span>
            </div>
            <select 
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-input-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary px-4 py-2 outline-none cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="PERSONAL">Personal</option>
              <option value="SHARED">Shared</option>
              <option value="CHILD">Child</option>
              <option value="HOME">Home</option>
            </select>
          </div>
          
          <div className="text-sm text-text-secondary">
            Showing <span className="text-white font-medium">{expenses.length}</span> transactions
          </div>
        </div>

        {/* Expenses Table */}
        <div className="bg-surface-dark rounded-xl border border-border-dark shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-text-secondary">
            <thead className="bg-white/5 text-xs uppercase font-medium text-slate-300">
              <tr>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                    Description <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                    Date <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 cursor-pointer hover:text-white transition-colors">
                    Amount <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-dark/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">Loading expenses...</td>
                </tr>
              ) : expenses.length > 0 ? (
                expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
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
                      <div className="flex items-center gap-2 group/cat">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {expense.category?.name || 'Uncategorized'}
                        </span>
                        <button 
                          onClick={() => {
                            setSelectedExpense(expense);
                            setIsEditCategoryModalOpen(true);
                          }}
                          className="p-1 text-text-secondary hover:text-white opacity-0 group-hover/cat:opacity-100 transition-all rounded"
                          title="Edit Category"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${
                        expense.type === 'SHARED' ? 'text-purple-400' : 
                        expense.type === 'CHILD' ? 'text-pink-400' : 'text-text-secondary'
                      }`}>
                        {expense.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right text-white font-medium">{formatCurrency(expense.value)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedExpense(expense);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-text-secondary hover:text-primary transition-all rounded-lg hover:bg-primary/10"
                          title="Edit Full Expense"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(expense.id, expense.description)}
                          className="p-2 text-text-secondary hover:text-rose-500 transition-all rounded-lg hover:bg-rose-500/10"
                          title="Delete Expense"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">No expenses found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <ExpenseModal 
        expense={selectedExpense}
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedExpense(null);
        }} 
        onSuccess={fetchExpenses}
      />
      <EditCategoryModal 
        expense={selectedExpense}
        isOpen={isEditCategoryModalOpen}
        onClose={() => {
          setIsEditCategoryModalOpen(false);
          setSelectedExpense(null);
        }}
        onSuccess={fetchExpenses}
      />
    </div>
  );
};

export default Expenses;
