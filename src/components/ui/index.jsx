import React from 'react';
import { NCAL_COLORS, STATUS_COLORS, ROLE_COLORS, GRADE_COLORS } from '../../utils/constants.js';

const NCAL_DOT_COLORS = {
  BLACK: '#a78bfa',  // purple — matches ncal-black-text token
  RED:   '#fca5a5',  // matches ncal-red-text
  ORANGE:'#fdba74',  // matches ncal-orange-text
  YELLOW:'#fde68a',  // matches ncal-yellow-text
  BLUE:  '#93c5fd',  // matches ncal-blue-text
};

export function NcalBadge({ value }) {
  const badgeMap = {
    BLACK: 'badge-neutral',
    RED: 'badge-error',
    DANGER: 'badge-error',
    ORANGE: 'badge-warning',
    YELLOW: 'badge-warning',
    BLUE: 'badge-info',
    SUCCESS: 'badge-success'
  };
  return (
    <span className={`badge ${badgeMap[value] || 'badge-neutral'} badge-sm font-semibold uppercase`} aria-label={`NCAL ${value}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-sm bg-current shrink-0 align-middle -mt-px mr-1.5" />
      {value}
    </span>
  );
}

export function StatusPill({ status }) {
  const labels = { open: 'OPEN', progress: 'IN PROGRESS', pending: 'PAUSED', done: 'DONE' };
  const badgeMap = { open: 'badge-info', progress: 'badge-success', pending: 'badge-warning', done: 'badge-ghost' };
  return (
    <span className={`badge ${badgeMap[status] || 'badge-ghost'} badge-sm font-semibold uppercase tracking-wider`}>
      {labels[status] || status}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className="badge badge-soft badge-neutral badge-sm font-semibold uppercase tracking-wider">
      {role}
    </span>
  );
}

export function GradeBadge({ grade }) {
  const colorMap = { VIP: 'badge-primary', Gold: 'badge-warning', Silver: 'badge-neutral', Bronze: 'badge-ghost' };
  return (
    <span className={`badge ${colorMap[grade] || 'badge-ghost'} badge-sm font-semibold`}>
      {grade}
    </span>
  );
}

export function StatusBadge({ active }) {
  return (
    <span className={`badge ${active ? 'badge-success badge-soft' : 'badge-ghost'} badge-sm font-semibold uppercase tracking-wider gap-1`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function AccentBadge({ text }) {
  return (
    <span className="badge badge-primary badge-soft badge-sm font-semibold">{text}</span>
  );
}

export function DurationBadge({ seconds, target }) {
  if (seconds == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const isExceeded = target && seconds > target;
  return (
    <span className="tabular" style={{ 
      color: isExceeded ? 'var(--danger)' : 'var(--text-secondary)',
      fontSize: 'var(--f-sm)',
      fontWeight: 500,
      fontFamily: 'var(--font-mono)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4
    }}>
      {isExceeded && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--danger)' }} />}
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
  
  const stateGroup = paused ? 'warning' : isExceeded || isUrgent ? 'danger' : isWarning ? 'warning' : 'success';
  const color = `var(--${stateGroup})`;
  const border = `var(--${stateGroup}-border)`;
  const bg = `var(--${stateGroup}-bg)`;

  return (
    <span
      className="tabular"
      style={{ 
        color, 
        fontSize: 'var(--f-sm)',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }}
    >
      <span style={{ 
        width: 6, height: 6, borderRadius: '50%', 
        background: color, 
        boxShadow: !paused && (isUrgent || isExceeded) ? `0 0 8px ${color}` : 'none',
        display: 'inline-block' 
      }} />
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      {paused && <span style={{ fontSize: '10px', opacity: 0.6 }}>PAUSED</span>}
    </span>
  );
}

export function Spinner({ size = 'md' }) {
  return <div className={`spinner${size === 'sm' ? ' spinner-sm' : ''}`} />;
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
  const sizeMap = { 'lg': 'max-w-3xl', 'xl': 'max-w-5xl', 'sm': 'max-w-sm' };
  return (
    <dialog className="modal modal-open" open>
      <div className={`modal-box p-0 flex flex-col ${sizeMap[size] || 'max-w-lg'}`}>
        <div className="flex justify-between items-center p-4 border-b border-base-200 bg-base-100">
          <h3 className="font-bold text-lg leading-none">{title}</h3>
          <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {children}
        </div>
        {footer && (
          <div className="p-4 m-0 border-t border-base-200 bg-base-100 flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
      <div className="modal-backdrop" onClick={onClose} style={{ cursor: 'default' }}>
        <button>close</button>
      </div>
    </dialog>
  );
}

export function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {desc && <div className="empty-state-desc">{desc}</div>}
      {action && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  );
}

export function SectionCard({ title, subtitle, action, children, style, noPadding }) {
  return (
    <div className="section-card" style={style}>
      {(title || action) && (
        <div className="section-card-header">
          <div>
            {title && <div className="section-card-title">{title}</div>}
            {subtitle && <div className="section-card-subtitle">{subtitle}</div>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'section-card-body'}>
        {children}
      </div>
    </div>
  );
}

export function PageSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '4rem' }}>
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
    <span className={`ncal-badge ${ncalClass}`} style={Object.assign({
      width: '64px' // adjusted strictly for L+3 digits (e.g., L398)
    }, !ncalClass ? {
      background: 'rgba(255, 255, 255, 0.1)',
      color: 'var(--text-muted)'
    } : {})}>
      <span style={{
        display: 'inline-block', width: 6, height: 6, borderRadius: '2px', // sharper dot
        background: isExceeded ? 'var(--danger)' : isSafe ? 'var(--success)' : 'currentColor',
        flexShrink: 0, verticalAlign: 'middle', marginTop: -1
      }} />
      L{level || 1}
    </span>
  );
}

export * from './chart.jsx';
export { default as UnifiedTimeline } from './UnifiedTimeline.jsx';
