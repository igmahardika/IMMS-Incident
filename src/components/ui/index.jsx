import React from 'react';
import { NCAL_COLORS, STATUS_COLORS, ROLE_COLORS, GRADE_COLORS } from '../../utils/constants.js';
import { getNcalBadgeClass } from '../../utils/themeMap.js';

const NCAL_DOT_COLORS = {
  BLACK: '#a78bfa',  // purple — matches ncal-black-text token
  RED:   '#fca5a5',  // matches ncal-red-text
  ORANGE:'#fdba74',  // matches ncal-orange-text
  YELLOW:'#fde68a',  // matches ncal-yellow-text
  BLUE:  '#93c5fd',  // matches ncal-blue-text
};

export function NcalBadge({ value }) {
  const badgeClass = getNcalBadgeClass(value);
  return (
    <span className={`badge ${badgeClass} badge-soft text-xs h-5 px-2 border-none rounded-md font-bold uppercase tracking-wider`} aria-label={`NCAL ${value}`}>
      <span className="inline-block w-1 h-1 rounded-full bg-current shrink-0 align-middle -mt-0.5 mr-1.5" />
      {value}
    </span>
  );
}

export function StatusPill({ status }) {
  const labels = { open: 'OPEN', progress: 'IN PROGRESS', pending: 'PAUSED', done: 'DONE' };
  const badgeMap = { open: 'badge-info', progress: 'badge-success', pending: 'badge-warning', done: 'badge-ghost' };
  return (
    <span className={`badge ${badgeMap[status] || 'badge-ghost'} badge-soft text-xs h-5 px-2 border-none rounded-md font-bold uppercase tracking-wider`}>
      {labels[status] || status}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className="badge badge-soft badge-neutral badge-sm border-none rounded-lg font-semibold uppercase tracking-wider">
      {role}
    </span>
  );
}

export function GradeBadge({ grade }) {
  const colorMap = { VIP: 'badge-primary', Gold: 'badge-warning', Silver: 'badge-neutral', Bronze: 'badge-ghost' };
  return (
    <span className={`badge ${colorMap[grade] || 'badge-ghost'} badge-soft badge-sm border-none rounded-lg font-semibold`}>
      {grade}
    </span>
  );
}

export function StatusBadge({ active }) {
  return (
    <span className={`badge ${active ? 'badge-success badge-soft' : 'badge-ghost'} badge-sm border-none rounded-lg font-semibold uppercase tracking-wider gap-1`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function AccentBadge({ text }) {
  return (
    <span className="badge badge-primary badge-soft badge-sm border-none rounded-lg font-semibold">{text}</span>
  );
}

export function DurationBadge({ seconds, target }) {
  if (seconds == null) return <span className="text-[color:var(--text-muted)]">—</span>;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const isExceeded = target && seconds > target;
  return (
    <span className={`font-mono text-sm font-medium inline-flex items-center gap-1 ${isExceeded ? 'text-error' : 'text-base-content/70'}`}>
      {isExceeded && <span className="inline-block w-1.5 h-1.5 rounded-full bg-error animate-pulse" />}
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  );
}

export function LiveTimer({ startIso, pausedSec = 0, paused = false, target }) {
  const [elapsed, setElapsed] = React.useState(0);

  React.useEffect(() => {
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
    success: 'text-success bg-success shadow-success/20',
    warning: 'text-warning bg-warning shadow-warning/20',
    danger:  'text-error bg-error shadow-error/40 animate-pulse',
    paused:  'text-base-content/40 bg-base-content/40 shadow-none'
  };

  const state = paused ? 'paused' : (isExceeded || isUrgent) ? 'danger' : isWarning ? 'warning' : 'success';

  return (
    <span className={`font-mono text-xs font-semibold inline-flex items-center gap-1.5 ${statusClasses[state].split(' ')[0]}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${statusClasses[state].split(' ')[1]} ${!paused && (isUrgent || isExceeded) ? 'shadow-[0_0_8px_rgba(var(--color-error),0.5)]' : ''}`} />
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      {paused && <span className="text-xs font-medium tracking-wider opacity-60 ml-0.5 uppercase">PAUSED</span>}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'loading-sm', md: 'loading-md', lg: 'loading-lg' };
  return (
    <div className="flex items-center justify-center p-4">
      <span className={`loading loading-spinner text-primary ${sizes[size] || 'loading-md'} ${className}`}></span>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const sizeMap = { 'sm': 'max-w-sm', 'md': 'max-w-md', 'lg': 'max-w-lg', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl', 'xl': 'max-w-5xl' };
  return (
    <dialog className="modal modal-open" open>
      <div className={`modal-box p-0 flex flex-col shadow-2xl overflow-hidden rounded-xl ${sizeMap[size] || 'max-w-lg'}`}>
        <div className="flex justify-between items-center px-4 py-3.5 bg-base-100">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-base-content/70 leading-none">{title}</h3>
          <button className="btn btn-xs btn-circle btn-ghost opacity-40 hover:opacity-100" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="px-4 py-4 overflow-y-auto max-h-[75vh]">
          {children}
        </div>
        {footer && (
          <div className="px-4 py-4 m-0 flex justify-end gap-2 bg-base-100/30">
            {footer}
          </div>
        )}
      </div>
      <div className="modal-backdrop bg-black/70 backdrop-blur-sm cursor-default" onClick={onClose}>
        <button>close</button>
      </div>
    </dialog>
  );
}

export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="hero bg-base-100 rounded-xl p-10 min-h-[300px]">
      <div className="hero-content text-center flex-col">
        <div className="text-5xl opacity-30 mb-2">{icon || '📦'}</div>
        <div className="max-w-md">
          <h2 className="text-xl font-bold">{title}</h2>
          {desc && <p className="py-4 text-sm opacity-70">{desc}</p>}
          {action && <div className="mt-2">{action}</div>}
        </div>
      </div>
    </div>
  );
}

// ─── SectionCard ──────────────────────────────────────────────────────────────
export function SectionCard({ title, subtitle, footer, children, className = '', headerAction, style, padding = true }) {
  return (
    <div className={`card bg-base-100 shadow-sm rounded-lg overflow-hidden ${className}`} style={style}>
      <div className={`card-body ${padding ? 'p-3 md:p-4 lg:p-6' : 'p-0'}`}>
        {(title || headerAction) && (
          <div className="flex items-center justify-between mb-4 px-0.5">
            <div>
              {title && <h2 className="text-xs font-semibold uppercase tracking-wider text-base-content/40">{title}</h2>}
              {subtitle && <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mt-1 leading-relaxed opacity-60">{subtitle}</p>}
            </div>
            {headerAction}
          </div>
        )}
        {children}
        {footer && (
          <div className="card-actions justify-end mt-4 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center pt-16">
      <Spinner />
    </div>
  );
}

export function LevelBadge({ level, targetHours }) {
  const isExceeded = targetHours != null && level > targetHours;
  const isSafe = targetHours != null && level <= targetHours;

  let ncalClass = '';
  if (isExceeded) ncalClass = 'ncal-DANGER';
  else if (isSafe) ncalClass = 'ncal-SUCCESS';

  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs font-semibold px-2 py-0.5 rounded-lg w-16 justify-center ${
        isExceeded ? 'bg-error/10 text-error'
        : isSafe ? 'bg-success/10 text-success'
        : 'bg-base-content/10 text-base-content/50'
      }`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-sm shrink-0 ${isExceeded ? 'bg-error' : isSafe ? 'bg-success' : 'bg-base-content/30'}`} />
      L{level || 1}
    </span>
  );
}

export * from './chart.jsx';
export { default as UnifiedTimeline } from './UnifiedTimeline.jsx';

// ─── Atomic UI Components & Skeletons ─────────────────────────────────────────

export function Button({ children, variant = 'primary', size = 'md', outline = false, icon, isLoading, className = '', ...props }) {
  const variantMap = {
    primary: 'btn-primary',
    error: 'btn-error',
    warning: 'btn-warning',
    info: 'btn-info',
    success: 'btn-success',
    neutral: 'btn-neutral',
    ghost: 'btn-ghost'
  };
  const sizeMap = { sm: 'btn-sm', md: '', lg: 'btn-lg', xs: 'btn-xs' };
  
  const baseClass = `btn ${variantMap[variant] || 'btn-primary'} ${sizeMap[size]} ${outline ? 'btn-outline' : ''} w-full md:w-auto transition-all duration-300 ${className}`;
  
  return (
    <button className={baseClass} disabled={isLoading || props.disabled} {...props}>
      {isLoading ? <span className="loading loading-spinner loading-xs"></span> : icon}
      {children}
    </button>
  );
}

export function Input({ label, error, type = 'text', className = '', ...props }) {
  return (
    <label className="form-control w-full gap-1.5">
      {label && (
        <div className="label p-0 min-h-0"><span className="label-text font-semibold text-xs uppercase tracking-wider text-base-content/40">{label}</span></div>
      )}
      <input type={type} className={`input input-md w-full focus:ring-2 focus:ring-primary/20 transition-all duration-300 font-semibold text-sm bg-base-200/50 ${error ? 'input-error' : ''} ${className}`} {...props} />
      {error && (
        <div className="label pb-0 pt-1 min-h-0"><span className="label-text-alt text-error font-semibold text-xs">{error}</span></div>
      )}
    </label>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="w-full flex flex-col gap-4 p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="skeleton h-8 w-1/3"></div>
        <div className="skeleton h-8 w-1/4"></div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="skeleton h-12 w-full"></div>
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card bg-base-100 shadow-sm p-6 w-full flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="skeleton h-12 w-12 rounded-2xl"></div>
        <div className="flex flex-col gap-2">
          <div className="skeleton h-3 w-16"></div>
          <div className="skeleton h-6 w-24"></div>
        </div>
      </div>
    </div>
  );
}
