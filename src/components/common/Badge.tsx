import React from 'react';

interface BadgeProps {
  variant?: 'nominal' | 'warning' | 'critical' | 'cyan' | 'muted' | 'outline';
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'nominal',
  pulse = false,
  children,
  className = '',
}) => {
  const variantStyles = {
    nominal: 'bg-secondary/15 text-secondary border border-secondary/20',
    warning: 'bg-tertiary/15 text-tertiary border border-tertiary/20',
    critical: 'bg-error/15 text-error border border-error/20',
    cyan: 'bg-primary/15 text-primary border border-primary/20',
    muted: 'bg-surface-container-high text-on-surface-variant',
    outline: 'border border-outline-variant text-outline bg-transparent',
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-label-sm text-label-sm font-mono tracking-wide ${variantStyles} ${className}`}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current"></span>
        </span>
      )}
      {children}
    </span>
  );
};
