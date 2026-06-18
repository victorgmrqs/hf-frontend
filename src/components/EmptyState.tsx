import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = 'py-16',
}) => (
  <div className={`flex flex-col items-center text-center ${className}`}>
    {icon && (
      <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mb-6 text-text-secondary">
        {icon}
      </div>
    )}
    <h3 className="text-white font-semibold text-xl mb-2">{title}</h3>
    {description && (
      <p className="text-text-secondary mb-8 max-w-sm">{description}</p>
    )}
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="bg-primary-strong hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg shadow-blue-900/20"
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
