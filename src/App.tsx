import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './hooks/useUser';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import AccountsPayable from './pages/AccountsPayable';
import Budgets from './pages/Budgets';
import SettingsPage from './pages/Settings';

function App() {
  return (
    <UserProvider>
      <Router>
        <div className="dark min-h-screen bg-background-dark">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/accounts-payable" element={<AccountsPayable />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </Router>
    </UserProvider>
  )
}

export default App
