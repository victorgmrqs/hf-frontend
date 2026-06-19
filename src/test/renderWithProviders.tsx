import { ReactElement, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { UserProvider } from '../hooks/useUser';
import { BudgetsProvider } from '../contexts/BudgetsContext';

/**
 * Render de integração: envolve a UI com os providers reais (UserProvider +
 * BudgetsProvider) e o MemoryRouter — espelhando o App. Use com os handlers MSW
 * de `pageHandlers` (+ overrides por cenário).
 */
export function renderWithProviders(ui: ReactElement, { route = '/' }: { route?: string } = {}) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <UserProvider>
      <BudgetsProvider>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </BudgetsProvider>
    </UserProvider>
  );
  return render(ui, { wrapper: Wrapper });
}
