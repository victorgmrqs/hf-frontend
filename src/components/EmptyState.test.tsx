import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('mostra título e descrição', () => {
    render(<EmptyState title="Nada aqui" description="Adicione o primeiro item" />);
    expect(screen.getByRole('heading', { name: 'Nada aqui' })).toBeInTheDocument();
    expect(screen.getByText('Adicione o primeiro item')).toBeInTheDocument();
  });

  it('só renderiza o botão de ação com actionLabel + onAction, e o clique dispara onAction', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { rerender } = render(<EmptyState title="X" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    rerender(<EmptyState title="X" actionLabel="Criar" onAction={onAction} />);
    await user.click(screen.getByRole('button', { name: 'Criar' }));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
