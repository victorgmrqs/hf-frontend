import React from 'react';
import { 
  LayoutDashboard, 
  ReceiptText, 
  CreditCard, 
  PieChart, 
  Settings
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/useUser';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { currentUser, allUsers, setCurrentUser } = useUser();
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/' },
    { icon: <ReceiptText size={20} />, label: 'Expenses', path: '/expenses' },
    { icon: <CreditCard size={20} />, label: 'Accounts Payable', path: '/accounts-payable' },
    { icon: <PieChart size={20} />, label: 'Budgets', path: '/budgets' },
    { icon: <Settings size={20} />, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside className="w-64 bg-surface-dark border-r border-border-dark flex flex-col fixed h-full z-10">
      <div className="h-16 flex items-center px-6 border-b border-border-dark">
        <CreditCard className="text-primary mr-2" size={32} />
        <h1 className="font-bold text-xl tracking-wide text-white">Home Finance</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center px-4 py-3 rounded-lg group transition-colors ${
              location.pathname === item.path
                ? 'bg-primary/10 text-primary'
                : 'text-text-secondary hover:bg-white/5 hover:text-white'
            }`}
          >
            <div className="mr-3">{item.icon}</div>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-border-dark relative">
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-surface-dark border border-border-dark rounded-xl shadow-2xl py-2 z-20">
            <div className="px-4 py-2 text-xs font-bold text-text-secondary uppercase tracking-wider">Switch User</div>
            {allUsers.map(user => (
              <button
                key={user.id}
                onClick={() => {
                  setCurrentUser(user);
                  setIsUserMenuOpen(false);
                }}
                className={`w-full flex items-center px-4 py-2 hover:bg-white/5 transition-colors ${currentUser?.id === user.id ? 'text-primary' : 'text-white'}`}
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mr-3 text-[10px] font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="text-sm font-medium">{user.name}</span>
              </button>
            ))}
          </div>
        )}
        <button 
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className="w-full flex items-center px-4 py-3 hover:bg-white/5 rounded-lg transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mr-3 font-bold text-sm text-white">
            {currentUser?.name.charAt(0) || '?'}
          </div>
          <div className="flex flex-col items-start flex-1 overflow-hidden">
            <span className="text-sm font-medium text-slate-200 truncate w-full text-left">{currentUser?.name || 'Loading...'}</span>
            <span className="text-xs text-text-secondary truncate w-full text-left">{currentUser?.email}</span>
          </div>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
