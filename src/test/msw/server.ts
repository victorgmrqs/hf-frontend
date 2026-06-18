import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Servidor MSW para o ambiente Node do Vitest (integração tela ↔ API mockada).
export const server = setupServer(...handlers);
