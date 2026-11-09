import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxWidth = 'max-w-2xl',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-background/80 backdrop-blur-md flex items-center justify-center p-space-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className={`bg-surface-container-low ${maxWidth} w-full rounded-xl shadow-2xl overflow-hidden flex flex-col border border-white/10`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-space-md bg-surface-container flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            {icon && <span className="material-symbols-outlined text-primary text-xl">{icon}</span>}
            <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="p-space-md overflow-y-auto max-h-[80vh]">{children}</div>
      </div>
    </div>
  );
};
