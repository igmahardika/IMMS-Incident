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
  const label = { open: 'OPEN', progress: 'PROGRESS', pending: 'PENDING', done: 'DONE' }[status] || status;
  return <span className={`status-pill status-${status}`}>{label}</span>;
}

export function DurationBadge({ seconds }) {
  if (seconds == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const str = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return <span className="timer-badge">{str}</span>;
}

export function LiveTimer({ startIso, pausedSec = 0, paused = false }) {
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
  return (
    <span className="timer-badge" style={{ color: paused ? 'var(--warning)' : elapsed > 14400 ? 'var(--danger)' : 'var(--success)', fontSize: '0.75rem' }}>
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      {paused && ' ⏸'}
    </span>
  );
}

export function Spinner() {
  return <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

export function Modal({ open, onClose, title, children, footer, size = '' }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${size ? ' modal-' + size : ''}`}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
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
      {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
  );
}

export function SectionCard({ title, subtitle, action, children, style }) {
  return (
    <div className="card" style={style}>
      {(title || action) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            {title && <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{title}</div>}
            {subtitle && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</div>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
