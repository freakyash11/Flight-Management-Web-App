'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);

  const toast = useCallback(({ message, variant }: ToastOptions) => {
    setCurrentToast({ message, variant });
    setTimeout(() => {
      setCurrentToast(null);
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {currentToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-[slide-up_0.2s_ease-out]">
          <div
            className={`px-6 py-3 rounded-xl shadow-2xl text-white font-medium text-sm flex items-center gap-2 ${
              currentToast.variant === 'success' ? 'bg-emerald-600' :
              currentToast.variant === 'error' ? 'bg-red-600' :
              'bg-blue-600'
            }`}
          >
            {currentToast.variant === 'success' && <span>✓</span>}
            {currentToast.variant === 'error' && <span>⚠</span>}
            {currentToast.variant === 'info' && <span>ℹ</span>}
            {currentToast.message}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
