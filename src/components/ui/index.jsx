import React from 'react';

const NCAL_ICONS = { BLACK: '⬛', RED: '🔴', ORANGE: '🟠', YELLOW: '🟡', BLUE: '🔵' };

export function NcalBadge({ value }) {
  return (
    <span className={`ncal-badge ncal-${value}`}>
      {NCAL_ICONS[value] || ''} {value}
    </span>
  );
}

export function StatusPill({ status }) {
  const labels = { open: 'OPEN', progress: 'IN PROGRESS', pending: 'PAUSED', done: 'DONE' };
  return <span className={`status-pill status-${status}`}>{labels[status] || status}</span>;
}

export function DurationBadge({ seconds, target }) {
  if (seconds == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const isExceeded = target && seconds > target;
  return (
    <span className={`timer-badge ${isExceeded ? 'timer-exceeded' : ''}`} style={isExceeded ? { color: 'var(--danger)', borderColor: 'var(--danger-border)', background: 'var(--danger-bg)' } : {}}>
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
  const isUrgent = elapsed > 14400; // 4 hours
  const isExceeded = target && elapsed > target;
  const color = paused ? 'var(--warning)' : isExceeded ? 'var(--danger)' : isUrgent ? 'var(--danger)' : 'var(--success)';
  const border = paused ? 'var(--warning-border)' : isExceeded ? 'var(--danger-border)' : isUrgent ? 'var(--danger-border)' : 'var(--success-border)';
  const bg = paused ? 'var(--warning-bg)' : isExceeded ? 'var(--danger-bg)' : isUrgent ? 'var(--danger-bg)' : 'var(--success-bg)';

  return (
    <span
      className={`timer-badge ${isExceeded ? 'timer-exceeded' : ''}`}
      style={{ color, borderColor: border, background: bg }}
    >
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      {paused && ' ⏸'}
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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

export function LevelBadge({ level }) {
  return (
    <span style={{ 
      background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
      padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-secondary)',
      display: 'inline-flex', alignItems: 'center', gap: 4, letterSpacing: '0.05em'
    }}>
      LVL {level || 1}
    </span>
  );
}

export * from './chart.jsx';
export { default as UnifiedTimeline } from './UnifiedTimeline.jsx';
