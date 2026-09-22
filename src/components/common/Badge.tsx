import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'amber' | 'emerald' | 'rose' | 'muted';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    default: 'bg-[#e8deca] text-[#362e25] border-[#d8ccb4] dark:bg-[#201d19] dark:text-[#d6ccbe] dark:border-[#332e27]',
    amber: 'bg-amber-500/15 text-amber-900 border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/20',
    emerald: 'bg-emerald-500/15 text-emerald-900 border-emerald-500/30 dark:bg-emerald-400/10 dark:text-emerald-300 dark:border-emerald-400/20',
    rose: 'bg-rose-500/15 text-rose-900 border-rose-500/30 dark:bg-rose-400/10 dark:text-rose-300 dark:border-rose-400/20',
    muted: 'bg-[#efe6d5] text-[#635749] border-[#dfd4be] dark:bg-[#181614] dark:text-[#8f8475] dark:border-[#27231e]',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border tracking-tight whitespace-nowrap ${sizeClasses} ${variantClasses[variant]}`}
    >
      {children}
    </span>
  );
};
