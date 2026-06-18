import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ConfirmDeleteModal from './ConfirmDeleteModal';

const baseProps = {
  isOpen: true,
  title: 'Excluir item',
  message: 'Tem certeza? Esta ação não pode ser desfeita.',
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe('ConfirmDeleteModal', () => {
  it('mostra título e mensagem quando aberto', () => {
    render(<ConfirmDeleteModal {...baseProps} />);
    expect(screen.getByRole('heading', { name: 'Excluir item' })).toBeInTheDocument();
    expect(screen.getByText(/não pode ser desfeita/)).toBeInTheDocument();
  });

  it('não renderiza quando isOpen=false', () => {
    render(<ConfirmDeleteModal {...baseProps} isOpen={false} />);
    expect(screen.queryByRole('heading', { name: 'Excluir item' })).not.toBeInTheDocument();
  });

  it('dispara onConfirm e onCancel nos botões correspondentes', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDeleteModal {...baseProps} onConfirm={onConfirm} onCancel={onCancel} />);

    await user.click(screen.getByRole('button', { name: /Excluir/ }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
