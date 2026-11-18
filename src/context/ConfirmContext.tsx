'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'modify';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(
  undefined
);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [activeModal, setActiveModal] = useState<{
    options: ConfirmOptions;
    resolve: (confirmed: boolean) => void;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setActiveModal({ options, resolve });
    });
  }, []);

  const handleClose = (confirmed: boolean) => {
    if (activeModal) {
      activeModal.resolve(confirmed);
      setActiveModal(null);
    }
  };

  const isDanger = activeModal?.options.variant === 'danger';

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {mounted &&
        activeModal &&
        createPortal(
          <div
            style={{
              zIndex: 2147483640,
              backgroundColor: 'rgba(24, 24, 27, 0.55)',
            }}
            className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => handleClose(false)}
          >
            <div
              style={{ zIndex: 2147483647 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md rounded-2xl bg-white border border-stone-200 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    style={{
                      backgroundColor: isDanger ? '#FEF2F2' : '#FFF8B9',
                      borderColor: isDanger ? '#FECACA' : 'rgba(86,130,3,0.3)',
                      color: isDanger ? '#DC2626' : '#568203',
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  >
                    {isDanger ? (
                      <AlertTriangle className="h-5 w-5" strokeWidth={1.5} />
                    ) : (
                      <CheckCircle2 className="h-5 w-5" strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-zinc-900">
                      {activeModal.options.title}
                    </h3>
                    <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">
                      {isDanger
                        ? 'Confirmation de suppression'
                        : 'Confirmation de modification'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:text-zinc-700 hover:bg-stone-100 transition-colors"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>

              <p className="text-[13px] text-zinc-600 leading-relaxed bg-stone-50 border border-stone-200/80 rounded-xl p-3.5">
                {activeModal.options.description}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleClose(false)}
                  className="btn-secondary"
                >
                  {activeModal.options.cancelLabel || 'Annuler'}
                </button>
                <button
                  type="button"
                  onClick={() => handleClose(true)}
                  style={{
                    backgroundColor: isDanger ? '#DC2626' : '#568203',
                    borderColor: isDanger ? '#DC2626' : '#568203',
                    color: '#FFFFFF',
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-[13px] font-medium shadow-sm transition-opacity hover:opacity-90"
                >
                  {activeModal.options.confirmLabel ||
                    (isDanger
                      ? 'Confirmer la suppression'
                      : 'Confirmer la modification')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm doit être utilisé dans un ConfirmProvider');
  }
  return ctx;
}
