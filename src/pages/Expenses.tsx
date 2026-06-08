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
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ExpenseModal from '../components/ExpenseModal';
import EditCategoryModal from '../components/EditCategoryModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import EmptyState from '../components/EmptyState';
import { toast } from 'sonner';
import { financeService, Expense, Category } from '../services/financeService';
import { useUser } from '../hooks/useUser';
import { useCompetences } from '../hooks/useCompetence';
import { formatCompetence } from '../utils/formatCompetence';

const Expenses: React.FC = () => {
  const { currentUser, allUsers } = useUser();
  const { availableCompetences, refreshCompetences } = useCompetences();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [competence, setCompetence] = useState(new Date().toISOString().substring(0, 7));
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; description: string } | null>(null);

  const PAGE_SIZE = 20;
  const filteredExpenses = expenses.filter(e =>
    e.description.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const paginatedExpenses = filteredExpenses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasActiveFilters = !!(typeFilter || categoryFilter || searchTerm);

  useEffect(() => {
    financeService.getCategories()
      .then(({ data }) => {
        if (data) setCategories(data);
      })
      .catch(() => toast.error('Erro ao carregar categorias'));
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchExpenses();
    }
  }, [competence, typeFilter, categoryFilter, currentUser]);

  useEffect(() => {
    setCurrentPage(1);
  }, [competence, typeFilter, searchTerm]);

  const fetchExpenses = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { data } = await financeService.getExpenses(
        currentUser.id,
        competence,
        typeFilter || undefined,
        categoryFilter || undefined,
      );
      if (data) setExpenses(data);
    } catch {
      toast.error('Erro ao carregar despesas');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setTypeFilter('');
    setCategoryFilter('');
    setSearchTerm('');
  };

  const handleDelete = (id: string, description: string) => {
    setDeleteTarget({ id, description });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !currentUser) return;
    const { error } = await financeService.deleteExpense(deleteTarget.id, currentUser.id);
    setDeleteTarget(null);
    if (!error) {
      fetchExpenses();
      toast.success('Despesa excluída com sucesso');
    } else {
      toast.error('Erro ao excluir despesa');
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
                {availableCompetences.map(c => (
                  <option key={c} value={c}>{formatCompetence(c)}</option>
                ))}
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
          <div className="flex items-center gap-4 flex-wrap">
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
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-input-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary px-4 py-2 outline-none cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-white border border-border-dark hover:border-primary/50 px-3 py-2 rounded-lg transition-colors"
              >
                <X size={14} />
                Limpar filtros
              </button>
            )}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-input-dark border border-border-dark text-white text-sm rounded-lg pl-9 pr-8 py-2 outline-none focus:border-primary focus:ring-1 focus:ring-primary w-56"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-secondary hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="text-sm text-text-secondary">
            <span className="text-white font-medium">{filteredExpenses.length}</span> despesa{filteredExpenses.length !== 1 ? 's' : ''} encontrada{filteredExpenses.length !== 1 ? 's' : ''}
            {searchTerm && <span className="text-text-secondary"> de {expenses.length} no total</span>}
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
              ) : filteredExpenses.length > 0 ? (
                paginatedExpenses.map(expense => (
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
                  <td colSpan={6}>
                    {hasActiveFilters ? (
                      <EmptyState
                        icon={<Search size={40} />}
                        title={
                          searchTerm && !(typeFilter || categoryFilter)
                            ? `Nenhuma despesa encontrada para "${searchTerm}".`
                            : !searchTerm
                              ? 'Nenhuma despesa encontrada para os filtros aplicados.'
                              : `Nenhuma despesa encontrada para "${searchTerm}" e filtros aplicados.`
                        }
                        actionLabel={
                          searchTerm && !(typeFilter || categoryFilter)
                            ? 'Limpar busca'
                            : !searchTerm
                              ? 'Limpar filtros'
                              : 'Limpar busca e filtros'
                        }
                        onAction={clearFilters}
                      />
                    ) : (
                      <EmptyState
                        icon={<ShoppingCart size={40} />}
                        title={`Nenhuma despesa em ${formatCompetence(competence)}.`}
                        description="Que tal registrar a primeira?"
                        actionLabel="Nova Despesa"
                        onAction={() => setIsModalOpen(true)}
                      />
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {!loading && filteredExpenses.length > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border-dark text-sm text-text-secondary hover:text-white hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              Anterior
            </button>
            <span className="text-sm text-text-secondary">
              Página <span className="text-white font-semibold">{currentPage}</span> de <span className="text-white font-semibold">{totalPages}</span>
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border-dark text-sm text-text-secondary hover:text-white hover:border-primary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </main>

      <ExpenseModal 
        expense={selectedExpense}
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedExpense(null);
        }} 
        onSuccess={() => {
          fetchExpenses();
          refreshCompetences();
        }}
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
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Excluir Despesa"
        message={`Tem certeza que deseja excluir "${deleteTarget?.description}"? Esta ação não pode ser desfeita.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default Expenses;
