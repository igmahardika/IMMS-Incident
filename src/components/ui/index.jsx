import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getNcalBadgeClass } from '../../utils/themeMap.js';
import { cn } from '../../lib/utils.js';

// ─── Badges ───────────────────────────────────────────────────────────────────

export function NcalBadge({ value }) {
  const styles = getNcalBadgeClass(value);
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] h-5 px-2 rounded font-bold uppercase tracking-widest leading-none",
      styles.bg, styles.text
    )} aria-label={`NCAL ${value}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current shrink-0 mr-1.5 opacity-80" />
      {value}
    </span>
  );
}

export function StatusPill({ status }) {
  const labels = { open: 'OPEN', progress: 'IN PROGRESS', pending: 'PAUSED', done: 'DONE' };
  const badgeMap = { 
    open: 'bg-info/10 text-info', 
    progress: 'bg-success/10 text-success', 
    pending: 'bg-warning/10 text-warning', 
    done: 'bg-foreground/10 text-foreground/60' 
  };
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] h-5 px-2 rounded font-bold uppercase tracking-widest leading-none",
      badgeMap[status] || 'bg-foreground/10 text-foreground/60'
    )}>
      {labels[status] || status}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className="inline-flex items-center text-[10px] h-5 px-2 rounded bg-foreground/10 text-foreground/70 font-bold uppercase tracking-widest leading-none">
      {role}
    </span>
  );
}

export function GradeBadge({ grade }) {
  const colorMap = { 
    VIP: 'bg-primary/10 text-primary', 
    Gold: 'bg-warning/10 text-warning', 
    Silver: 'bg-foreground/10 text-foreground/70', 
    Bronze: 'bg-foreground/5 text-foreground/60' 
  };
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] h-5 px-2 rounded font-bold tracking-widest leading-none",
      colorMap[grade] || 'bg-foreground/5 text-foreground/60'
    )}>
      {grade}
    </span>
  );
}

export function StatusBadge({ active }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center text-[10px] h-5 px-2 rounded font-bold uppercase tracking-widest leading-none gap-1",
      active ? 'bg-success/10 text-success' : 'bg-foreground/5 text-foreground/50'
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-success" : "bg-foreground/30")} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function AccentBadge({ text }) {
  return (
    <span className="inline-flex items-center justify-center text-[10px] h-5 px-2 rounded bg-primary/10 text-primary font-bold uppercase tracking-widest leading-none">
      {text}
    </span>
  );
}

// ─── Timers & Duration ────────────────────────────────────────────────────────

export function DurationBadge({ seconds, target }) {
  if (seconds == null) return <span className="text-muted-foreground">—</span>;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const isExceeded = target && seconds > target;
  return (
    <span className={cn(
      "font-mono text-[11px] tabular-nums font-bold inline-flex items-center gap-1",
      isExceeded ? 'text-error' : 'text-foreground/70'
    )}>
      {isExceeded && <span className="inline-block w-1.5 h-1.5 rounded-full bg-error animate-pulse" />}
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  );
}

export function LiveTimer({ startIso, pausedSec = 0, paused = false, target }) {
  const [elapsed, setElapsed] = React.useState(0);

  useEffect(() => {
    if (!startIso) return;
    const calc = () => {
      const base = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000) - pausedSec;
      setElapsed(Math.max(0, base));
    };
    calc();
    if (paused) return;
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [startIso, pausedSec, paused]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const isWarning = elapsed > 7200 && elapsed <= 14400; // 2-4 hours
  const isUrgent = elapsed > 14400; // >4 hours
  const isExceeded = target && elapsed > target;
  
  const statusClasses = {
    success: 'text-success/90',
    warning: 'text-warning',
    danger:  'text-error animate-pulse',
    paused:  'text-foreground/40'
  };

  const state = paused ? 'paused' : (isExceeded || isUrgent) ? 'danger' : isWarning ? 'warning' : 'success';

  return (
    <span className={cn(
      "font-mono tabular-nums text-[11px] font-bold inline-flex items-center gap-1.5",
      statusClasses[state]
    )}>
      <span className={cn(
        "inline-block w-1.5 h-1.5 rounded-full shrink-0",
        state === 'success' && 'bg-success/80',
        state === 'warning' && 'bg-warning',
        state === 'danger' && 'bg-error shadow-[0_0_8px_rgba(var(--color-error),0.5)]',
        state === 'paused' && 'bg-foreground/30'
      )} />
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      {paused && <span className="text-[9px] font-black tracking-widest opacity-60 ml-0.5 uppercase">PAUSED</span>}
    </span>
  );
}

export function LevelBadge({ level, targetHours }) {
  const isExceeded = targetHours != null && level > targetHours;
  const isSafe = targetHours != null && level <= targetHours;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded w-12 justify-center leading-none tracking-tight",
        isExceeded ? 'bg-error/10 text-error'
        : isSafe ? 'bg-success/10 text-success'
        : 'bg-foreground/5 text-foreground/50'
      )}
    >
      <span className={cn(
        "inline-block w-1 h-1 rounded-sm shrink-0",
        isExceeded ? 'bg-error' : isSafe ? 'bg-success' : 'bg-foreground/30'
      )} />
      L{level || 1}
    </span>
  );
}

// ─── Modal & States ──────────────────────────────────────────────────────────

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
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
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
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-foreground/10 rounded-xl bg-foreground/[0.02] min-h-[300px]">
      <div className="text-5xl opacity-30 mb-4">{icon || '📦'}</div>
      <h2 className="text-sm font-bold uppercase tracking-wider text-foreground/70">{title}</h2>
      {desc && <p className="mt-2 text-[11px] text-foreground/50 max-w-sm">{desc}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// ─── UI Components ────────────────────────────────────────────────────────────

export function SectionCard({ title, subtitle, footer, children, className = '', headerAction, style, padding = true }) {
  return (
    <div className={cn("bg-background border border-foreground/5 shadow-sm rounded-xl overflow-hidden flex flex-col", className)} style={style}>
      <div className={cn("flex flex-col flex-1", padding ? "p-4 md:p-6" : "")}>
        {(title || headerAction) && (
          <div className={cn("flex items-center justify-between mb-5", !padding && "px-4 pt-4")}>
            <div>
              {title && <h2 className="text-[10px] font-black uppercase tracking-widest text-foreground/50">{title}</h2>}
              {subtitle && <p className="text-[10px] font-semibold text-foreground/40 mt-0.5 leading-relaxed">{subtitle}</p>}
            </div>
            {headerAction}
          </div>
        )}
        {children}
      </div>
      {footer && (
        <div className={cn(
          "px-4 py-3 border-t border-foreground/5 bg-foreground/[0.02] mt-auto flex justify-end",
          padding && "mx-4 mb-4 rounded-xl border border-transparent bg-muted/50"
        )}>
          {footer}
        </div>
      )}
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
    <div className="flex items-center justify-center h-[50vh]">
      <Spinner size="lg" />
    </div>
  );
}

// ─── Forms & Buttons ──────────────────────────────────────────────────────────

export function Button({ children, variant = 'primary', size = 'md', outline = false, icon, isLoading, className = '', ...props }) {
  const baseClasses = "inline-flex items-center justify-center font-bold tracking-wider rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:pointer-events-none active:scale-95";
  
  const variants = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-primary shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary",
    error: "bg-error text-white hover:bg-error/90 focus:ring-error shadow-sm",
    warning: "bg-warning text-warning-foreground hover:bg-warning/90 focus:ring-warning shadow-sm",
    info: "bg-info text-info-foreground hover:bg-info/90 focus:ring-info",
    success: "bg-success text-white hover:bg-success/90 focus:ring-success shadow-sm",
    neutral: "bg-foreground/10 text-foreground hover:bg-foreground/20 focus:ring-foreground/50",
    ghost: "bg-transparent text-foreground/70 hover:bg-foreground/10 hover:text-foreground focus:ring-foreground/50",
  };

  const outlineVariants = {
    primary: "border border-primary text-primary hover:bg-primary/10",
    error: "border border-error text-error hover:bg-error/10",
    neutral: "border border-border text-foreground hover:bg-muted",
  };

  const sizes = { 
    xs: "h-6 px-2.5 text-[9px] uppercase", 
    sm: "h-8 px-3 text-[10px] uppercase", 
    md: "h-10 px-4 text-[11px] uppercase", 
    lg: "h-12 px-6 text-xs uppercase" 
  };
  
  const currentVariant = outline ? (outlineVariants[variant] || outlineVariants.primary) : (variants[variant] || variants.primary);

  return (
    <button className={cn(baseClasses, currentVariant, sizes[size], "w-full md:w-auto", className)} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <Loader2 className="animate-spin mr-2" size={14} /> : (icon && <span className="mr-2">{icon}</span>)}
      {children}
    </button>
  );
}

export function Input({ label, error, type = 'text', className = '', ...props }) {
  return (
    <div className="flex flex-col w-full gap-1.5">
      {label && (
        <label className="font-bold text-[10px] uppercase tracking-widest text-foreground/50 ml-1">
          {label}
        </label>
      )}
      <input 
        type={type} 
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-[11px] font-medium shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error focus-visible:ring-error",
          className
        )} 
        {...props} 
      />
      {error && (
        <span className="text-error font-bold text-[10px] ml-1 mt-0.5">{error}</span>
      )}
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="w-full flex flex-col gap-4 p-4 border border-border/50 rounded-lg">
      <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-4">
        <div className="h-6 w-1/3 bg-muted rounded animate-pulse"></div>
        <div className="h-6 w-1/4 bg-muted rounded animate-pulse"></div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="h-10 w-full bg-muted/60 rounded animate-pulse delay-[50ms]"></div>
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

export * from './chart.jsx';
export { default as UnifiedTimeline } from './UnifiedTimeline.jsx';
