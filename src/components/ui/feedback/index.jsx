import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils.js';

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const sizeMap = { 
    'sm': 'max-w-sm', 'md': 'max-w-md', 'lg': 'max-w-lg', 
    '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', 'xl': 'max-w-5xl' 
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      <div className={cn(
        "relative z-50 flex flex-col w-full max-h-[85vh] bg-background rounded-xl border border-border shadow-2xl overflow-hidden m-4 animate-in fade-in zoom-in-95 duration-200",
        sizeMap[size] || 'max-w-lg'
      )}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-foreground/[0.02]">
          <h3 className="font-bold text-xs uppercase tracking-widest text-foreground/80 leading-none">{title}</h3>
          <button 
            className="p-1.5 rounded-md text-foreground/40 hover:text-foreground hover:bg-foreground/5 transition-colors focus:outline-none focus:ring-2 focus:ring-ring" 
            onClick={onClose} 
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        
        <div className="px-5 py-5 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
        
        {footer && (
          <div className="px-5 py-4 border-t border-border bg-muted/40 flex justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center min-h-[280px] gap-3">
      <div className="text-foreground/20 mb-1">{icon || '📦'}</div>
      <h2 className="text-[11px] font-black uppercase tracking-widest text-foreground/50">{title}</h2>
      {desc && <p className="text-[10px] font-medium text-foreground/35 max-w-xs leading-relaxed">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ size = 'md', className = '' }) {
  const sizeMap = { sm: 16, md: 24, lg: 32 };
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 size={sizeMap[size] || 24} className={cn("animate-spin text-primary", className)} />
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

export function TableSkeleton({ rows = 8 }) {
  const cols = [60, 120, 200, 100, 80, 130];
  return (
    <div className="w-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-foreground/[0.02] border-b border-foreground/5">
        {cols.map((w, i) => (
          <div key={i} className="h-3 bg-foreground/10 rounded animate-pulse" style={{ width: w, flexShrink: 0 }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-foreground/[0.04]" style={{ animationDelay: `${i * 40}ms` }}>
          {cols.map((w, j) => (
            <div
              key={j}
              className="h-4 bg-foreground/[0.06] rounded animate-pulse"
              style={{ width: j === 2 ? w * (0.5 + Math.random() * 0.5) : w, flexShrink: 0, animationDelay: `${(i + j) * 30}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="border border-border/50 rounded-xl p-6 w-full flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 bg-muted rounded-xl animate-pulse"></div>
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
          <div className="h-5 w-24 bg-muted/60 rounded animate-pulse delay-75"></div>
        </div>
      </div>
    </div>
  );
}
