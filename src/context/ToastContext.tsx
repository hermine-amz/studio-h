'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (params: {
    title: string;
    description?: string;
    type?: ToastType;
  }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      title,
      description,
      type = 'success',
    }: {
      title: string;
      description?: string;
      type?: ToastType;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, title, description, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-stone-200 p-3 text-zinc-900 shadow-lg transition-all duration-200"
          >
            <div className="mt-0.5 shrink-0">
              {item.type === 'success' && (
                <CheckCircle2
                  className="h-4 w-4 text-[#568203]"
                  strokeWidth={1.5}
                />
              )}
              {item.type === 'error' && (
                <AlertTriangle
                  className="h-4 w-4 text-amber-600"
                  strokeWidth={1.5}
                />
              )}
              {item.type === 'info' && (
                <Info className="h-4 w-4 text-zinc-700" strokeWidth={1.5} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-900 leading-snug">
                {item.title}
              </p>
              {item.description && (
                <p className="mt-0.5 text-[11px] text-zinc-500 leading-relaxed">
                  {item.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(item.id)}
              className="shrink-0 rounded-md p-1 text-zinc-400 hover:text-zinc-700 hover:bg-stone-100 transition-colors"
              aria-label="Fermer la notification"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast doit être utilisé dans un ToastProvider');
  }
  return ctx;
}
