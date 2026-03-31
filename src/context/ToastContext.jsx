import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

let toastId = 0;
const MAX_TOASTS = 5;

const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚡',
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
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => removeToast(t.id)} role="alert" aria-live="polite">
            <span style={{ fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>{TOAST_ICONS[t.type] || 'ℹ'}</span>
            <span style={{ flex: 1 }}>{t.message}</span>
            <span style={{ opacity: 0.5, cursor: 'pointer', fontSize: '0.9rem' }} aria-label="Dismiss">✕</span>
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
