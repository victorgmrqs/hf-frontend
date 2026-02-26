import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Tag, 
  CreditCard, 
  Plus, 
  Trash2, 
  Users
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import CategoryModal from '../components/CategoryModal';
import PaymentMethodModal from '../components/PaymentMethodModal';
import { financeService, Category, PaymentMethod } from '../services/financeService';
import { useUser } from '../hooks/useUser';

const SettingsPage: React.FC = () => {
  const { currentUser } = useUser();
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [cats, pms] = await Promise.all([
        financeService.getCategories(),
        financeService.getPaymentMethods(currentUser.id)
      ]);
      if (cats.data) setCategories(cats.data);
      if (pms.data) setPaymentMethods(pms.data);
    } catch (error) {
      console.error("Failed to fetch settings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the category "${name}"?`)) {
      const { error } = await financeService.deleteCategory(id);
      if (!error) {
        fetchData();
      } else {
        alert('Error deleting category: ' + (error.message || 'Check if there are expenses linked to it.'));
      }
    }
  };

  const handleDeletePaymentMethod = async (id: string, name: string) => {
    if (!currentUser) return;
    if (confirm(`Are you sure you want to delete the payment method "${name}"?`)) {
      const { error } = await financeService.deletePaymentMethod(id, currentUser.id);
      if (!error) {
        fetchData();
      } else {
        alert('Error deleting payment method: ' + (error.message || 'Check if there are expenses linked to it (FPG-05).'));
      }
    }
  };

  const getPaymentTypeLabel = (type: string) => {
    return type.replace('_', ' ').toLowerCase();
  };

  return (
    <div className="flex min-h-screen bg-background-dark text-white">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="text-primary" /> Settings
          </h2>
          <p className="text-text-secondary mt-1">Manage your categories and payment methods</p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Categories Section */}
          <section className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border-dark flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <Tag className="text-primary" size={20} />
                <h3 className="font-semibold text-lg text-white">Categories</h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedCategory(null);
                  setIsCategoryModalOpen(true);
                }}
                className="text-primary hover:text-blue-400 text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus size={16} /> Add Category
              </button>
            </div>
            
            <div className="p-4">
              {loading ? (
                <div className="py-10 text-center text-text-secondary">Loading...</div>
              ) : categories.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categories.map(cat => (
                    <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg bg-input-dark border border-border-dark group hover:border-primary/50 transition-colors">
                      <div 
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => {
                          setSelectedCategory(cat);
                          setIsCategoryModalOpen(true);
                        }}
                      >
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium text-white">{cat.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        className="text-text-secondary hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-text-secondary italic">No categories found.</div>
              )}
            </div>
          </section>

          {/* Payment Methods Section */}
          <section className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-border-dark flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <CreditCard className="text-primary" size={20} />
                <h3 className="font-semibold text-lg text-white">Payment Methods</h3>
              </div>
              <button 
                onClick={() => {
                  setSelectedPaymentMethod(null);
                  setIsPaymentModalOpen(true);
                }}
                className="text-primary hover:text-blue-400 text-sm font-bold flex items-center gap-1 transition-colors"
              >
                <Plus size={16} /> Add Method
              </button>
            </div>
            
            <div className="p-4">
              {loading ? (
                <div className="py-10 text-center text-text-secondary">Loading...</div>
              ) : paymentMethods.length > 0 ? (
                <div className="space-y-3">
                  {paymentMethods.map(pm => (
                    <div key={pm.id} className="flex items-center justify-between p-4 rounded-lg bg-input-dark border border-border-dark group hover:border-primary/50 transition-colors">
                      <div 
                        className="flex items-center gap-4 cursor-pointer flex-1"
                        onClick={() => {
                          setSelectedPaymentMethod(pm);
                          setIsPaymentModalOpen(true);
                        }}
                      >
                        <div className="p-2 bg-primary/10 text-primary rounded-lg">
                          <CreditCard size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-white flex items-center gap-2">
                            {pm.name}
                            {pm.shared && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-bold uppercase">
                                <Users size={10} /> Shared
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-text-secondary capitalize">{getPaymentTypeLabel(pm.type)}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeletePaymentMethod(pm.id, pm.name)}
                        className="text-text-secondary hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-text-secondary italic">No payment methods found.</div>
              )}
            </div>
          </section>
        </div>
      </main>

      <CategoryModal 
        category={selectedCategory}
        isOpen={isCategoryModalOpen} 
        onClose={() => {
          setIsCategoryModalOpen(false);
          setSelectedCategory(null);
        }} 
        onSuccess={fetchData} 
      />
      
      <PaymentMethodModal 
        paymentMethod={selectedPaymentMethod}
        isOpen={isPaymentModalOpen} 
        onClose={() => {
          setIsPaymentModalOpen(false);
          setSelectedPaymentMethod(null);
        }} 
        onSuccess={fetchData} 
      />
    </div>
  );
};

export default SettingsPage;
