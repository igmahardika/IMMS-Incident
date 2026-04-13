import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '../lib/utils.js';

const ToastContext = createContext(null);

let toastId = 0;
const MAX_TOASTS = 5;

const TOAST_STYLES = {
  success: 'bg-success/10 border-success/20 text-success',
  error: 'bg-error/10 border-error/20 text-error',
  warning: 'bg-warning/10 border-warning/20 text-warning',
  info: 'bg-primary/10 border-primary/20 text-primary',
};

const TOAST_ICONS = {
  success: <CheckCircle2 size={16} strokeWidth={2.5} />,
  error: <XCircle size={16} strokeWidth={2.5} />,
  warning: <AlertTriangle size={16} strokeWidth={2.5} />,
  info: <Info size={16} strokeWidth={2.5} />,
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    setToasts((prev) => {
      if (prev.some(t => t.message === message && t.type === type)) return prev;
      const trimmed = prev.length >= MAX_TOASTS ? prev.slice(1) : prev;
      const id = ++toastId;
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), duration);
      return [...trimmed, { id, message, type }];
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-0 right-0 z-[9999] p-4 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={cn(
              "pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-right-4 fade-in cursor-pointer",
              TOAST_STYLES[t.type] || TOAST_STYLES.info
            )}
            onClick={() => removeToast(t.id)} 
            role="alert" 
            aria-live="polite"
          >
            <div className="flex items-start gap-3 w-full min-w-0">
              <div className="shrink-0 mt-0.5">{TOAST_ICONS[t.type] || TOAST_ICONS.info}</div>
              <span className="text-[11px] font-bold leading-tight uppercase tracking-wide flex-1 break-words">{t.message}</span>
            </div>
            <button className="shrink-0 opacity-40 hover:opacity-100 transition-opacity p-1 -mr-1" aria-label="Dismiss">
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
