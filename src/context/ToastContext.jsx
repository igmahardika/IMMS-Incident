import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;
const MAX_TOASTS = 5;

const TOAST_CLASSES = {
  success: 'alert-success',
  error: 'alert-error',
  warning: 'alert-warning',
  info: 'alert-info',
};

const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠️',
  info: 'ℹ',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    setToasts((prev) => {
      // Deduplicate: don't add if exact same message already visible
      if (prev.some(t => t.message === message && t.type === type)) return prev;
      // Enforce max limit: drop the oldest if at limit
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
      <div className="toast toast-top toast-end z-[9999] p-4 flex flex-col gap-2">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`alert ${TOAST_CLASSES[t.type] || 'alert-info'} shadow-2xl border border-base-content/10 bg-base-100 flex items-center gap-4 min-w-[320px] transition-all duration-300 animate-in slide-in-from-right-4 cursor-pointer`} 
            onClick={() => removeToast(t.id)} 
            role="alert" 
            aria-live="polite"
          >
            <div className="flex items-center gap-3 w-full">
              <span className="font-bold text-lg shrink-0">{TOAST_ICONS[t.type] || 'ℹ'}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] flex-1">{t.message}</span>
              <span className="opacity-30 hover:opacity-100 transition-opacity text-sm font-bold" aria-label="Dismiss">✕</span>
            </div>
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
