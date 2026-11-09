import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  glow = false,
}) => {
  return (
    <div
      className={`relative rounded-xl bg-surface-container-low/90 backdrop-blur-md p-space-md shadow-md border border-white/[0.04] ${
        glow ? 'hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.15)] transition-all' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
