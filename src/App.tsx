import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { UserProvider } from './hooks/useUser';
import { BudgetsProvider } from './contexts/BudgetsContext';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import AccountsPayable from './pages/AccountsPayable';
import Budgets from './pages/Budgets';
import Income from './pages/Income';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <UserProvider>
      <BudgetsProvider>
        <Router>
          <div className="dark min-h-screen bg-background-dark">
            <Toaster richColors position="bottom-right" />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/accounts-payable" element={<AccountsPayable />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/income" element={<Income />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </Router>
      </BudgetsProvider>
    </UserProvider>
  )
}

export default App
