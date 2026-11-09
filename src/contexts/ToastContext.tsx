import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  icon?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, icon?: string, type?: ToastItem['type']) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, icon = 'check_circle', type: ToastItem['type'] = 'success') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastItem = { id, message, icon, type };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      dismissToast(id);
    }, 3800);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-md w-full px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-high text-on-surface shadow-[0_4px_24px_rgba(0,0,0,0.5)] border border-white/5 animate-in fade-in slide-in-from-bottom-5 duration-300"
          >
            <div className="flex items-center gap-3">
              <span className={`material-symbols-outlined text-xl ${
                toast.type === 'error' ? 'text-error' :
                toast.type === 'warning' ? 'text-tertiary' :
                toast.type === 'info' ? 'text-primary' : 'text-secondary'
              }`}>
                {toast.icon || 'check_circle'}
              </span>
              <span className="font-body-md text-body-md font-medium text-on-surface">
                {toast.message}
              </span>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-on-surface-variant hover:text-on-surface transition-colors p-1"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
