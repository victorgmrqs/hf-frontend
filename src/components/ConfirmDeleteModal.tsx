import React from 'react';
import { X, Trash2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-50 w-full max-w-[420px] bg-surface-dark rounded-xl shadow-2xl border border-border-dark overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-dark">
          <h2 className="text-white text-lg font-bold">{title}</h2>
          <button
            onClick={onCancel}
            className="text-text-secondary hover:text-white p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-text-secondary text-sm leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-border-dark flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg text-white font-medium hover:bg-white/5 border border-transparent hover:border-border-dark transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} />
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
