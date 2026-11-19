'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      {mounted &&
        createPortal(
          <div
            style={{ zIndex: 2147483645 }}
            className="fixed top-16 sm:top-5 right-3 left-3 sm:left-auto sm:right-5 sm:w-96 flex flex-col gap-2.5 pointer-events-none"
          >
            {toasts.map((item) => (
              <div
                key={item.id}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-3.5 shadow-2xl backdrop-blur-md transition-all duration-200 ${
                  item.type === 'error'
                    ? 'bg-red-50/95 border-red-300 text-red-950'
                    : item.type === 'success'
                    ? 'bg-white/95 border-[#568203]/45 text-zinc-900'
                    : 'bg-white/95 border-stone-300 text-zinc-900'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border ${
                    item.type === 'error'
                      ? 'bg-red-100 border-red-200 text-red-600'
                      : item.type === 'success'
                      ? 'bg-[#FFF8B9] border-[#568203]/30 text-[#568203]'
                      : 'bg-stone-100 border-stone-200 text-zinc-700'
                  }`}
                >
                  {item.type === 'success' && (
                    <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  {item.type === 'error' && (
                    <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  {item.type === 'info' && (
                    <Info className="h-4 w-4" strokeWidth={1.75} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs font-semibold leading-snug ${
                      item.type === 'error' ? 'text-red-900' : 'text-zinc-900'
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.description && (
                    <p
                      className={`mt-0.5 text-[11px] leading-relaxed ${
                        item.type === 'error' ? 'text-red-700' : 'text-zinc-600'
                      }`}
                    >
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
          </div>,
          document.body
        )}
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
