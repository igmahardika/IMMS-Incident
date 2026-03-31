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
  return (
    <span className={`ncal-badge ncal-${value}`} aria-label={`NCAL ${value}`}>
      <span style={{
        display: 'inline-block', width: 6, height: 6, borderRadius: '2px', // sharper dot
        background: NCAL_DOT_COLORS[value] || 'currentColor',
        flexShrink: 0, verticalAlign: 'middle', marginTop: -1
      }} />
      {value}
    </span>
  );
}

export function StatusPill({ status }) {
  const labels = { open: 'OPEN', progress: 'IN PROGRESS', pending: 'PAUSED', done: 'DONE' };
  const color = STATUS_COLORS[status] || 'var(--text-secondary)';
  return (
    <span 
      className={`status-pill status-${status}`} 
      style={{ 
        background: `color-mix(in srgb, ${color}, transparent 80%)`, 
        color,
        fontSize: 'var(--f-xs)',
        fontWeight: '600',
        padding: '0 6px',
        height: '18px',
        borderRadius: 'var(--radius-sm)',
        display: 'inline-flex',
        alignItems: 'center',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        transition: 'all var(--t-theme)'
      }}
    >
      {labels[status] || status}
    </span>
  );
}

export function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] || 'var(--text-secondary)';
  return (
    <span className="text-xs" style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: '18px', borderRadius: 'var(--radius-sm)',
      background: `color-mix(in srgb, ${color}, transparent 80%)`, 
      color,
      fontSize: 'var(--f-xs)',
      textTransform: 'uppercase',
      fontWeight: '600',
      letterSpacing: '0.04em',
      transition: 'all var(--t-theme)'
    }}>
      {role}
    </span>
  );
}

export function GradeBadge({ grade }) {
  const color = GRADE_COLORS[grade] || 'var(--text-muted)';
  return (
    <span className="text-xs" style={{
      display: 'inline-flex', padding: '0.125rem 0.438rem', borderRadius: 4,
      background: `${color}33`, color
    }}>
      {grade}
    </span>
  );
}

export function StatusBadge({ active }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '0 6px', height: '18px', borderRadius: 'var(--radius-sm)',
      background: active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
      color: active ? 'var(--success)' : 'var(--text-muted)',
      fontSize: 'var(--f-xs)',
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: '0.04em'
    }}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function AccentBadge({ text }) {
  return (
    <span className="badge badge-accent">{text}</span>
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
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${size ? ' modal-' + size : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
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
