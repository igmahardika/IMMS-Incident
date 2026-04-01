import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, ExternalLink, CheckCheck } from 'lucide-react';
import { api, formatDateTime } from '../../utils/api.js';
import { useNavigate } from 'react-router-dom';

const POLL_INTERVAL = 10000; // 10s

function playNotificationSound() {
  try {
    const audio = new Audio('/notification.wav');
    audio.volume = 0.55;
    audio.play().catch(() => {}); // catch autoplay block silently
  } catch (_) {}
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const prevIdsRef = useRef(new Set());
  const panelRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);

      // Detect new ones — any id not seen before
      const currentIds = new Set(data.map(n => n.id));
      const isFirstLoad = prevIdsRef.current.size === 0;

      if (!isFirstLoad) {
        const newOnes = data.filter(n => !prevIdsRef.current.has(n.id));
        if (newOnes.length > 0) {
          playNotificationSound();
        }
      }

      prevIdsRef.current = currentIds;
      setUnread(data.filter(n => !n.is_read).length);
    } catch (_) {}
  }, []);

  // Initial + polling
  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      const unreadItems = notifications.filter(n => !n.is_read);
      await Promise.all(unreadItems.map(n => api.markNotificationRead(n.id)));
      fetchNotifications();
    } catch (_) {}
  };

  const handleClickNotif = async (n) => {
    await api.markNotificationRead(n.id).catch(() => {});
    setOpen(false);
    if (n.incident_id) navigate(`/incidents/${n.incident_id}`);
    fetchNotifications();
  };

  return (
    <div style={{ position: 'relative' }} ref={panelRef}>
      {/* Bell Button */}
      <button
        className="theme-toggle"
        onClick={() => setOpen(v => !v)}
        aria-label="Notifications"
        title="Notifications"
        style={{ position: 'relative' }}
      >
        <Bell size={15} style={{ color: unread > 0 ? 'var(--accent-light)' : 'currentColor' }} />
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 3, right: 3,
            width: 8, height: 8,
            borderRadius: '50%',
            background: 'var(--danger)',
            border: '1.5px solid var(--bg-surface)',
            animation: 'pulse 2s infinite',
          }} />
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 360,
          maxHeight: 480,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 2000,
          animation: 'fadeIn 0.15s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-0)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={14} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 700, fontSize: '0.866rem', color: 'var(--text-primary)' }}>
                Recent Updates
              </span>
              {unread > 0 && (
                <span style={{
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: '0.643rem',
                  fontWeight: 700,
                  borderRadius: 99,
                  padding: '1px 6px',
                  lineHeight: 1.6,
                }}>
                  {unread} new
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {unread > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '0.714rem', gap: 4 }}
                  title="Mark all as read"
                >
                  <CheckCheck size={12} />
                  All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="btn btn-ghost btn-sm btn-square"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '2.5rem 1rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
              }}>
                <Bell size={28} style={{ opacity: 0.2, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotif(n)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: n.is_read ? 'transparent' : 'var(--accent-subtle)',
                    borderLeft: `3px solid ${n.is_read ? 'transparent' : 'var(--accent)'}`,
                    transition: 'background var(--t-fast)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--accent-subtle)'}
                >
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
                  }}>
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: n.is_read ? 400 : 600,
                      color: n.is_read ? 'var(--text-secondary)' : 'var(--text-primary)',
                      lineHeight: 1.45,
                      flex: 1,
                    }}>
                      {n.message}
                    </span>
                    {n.incident_id && (
                      <ExternalLink size={12} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.714rem', color: 'var(--text-muted)' }}>
                      {formatDateTime(n.created_at)}
                    </span>
                    {!n.is_read && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'inline-block',
                      }} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '0.5rem 1rem',
              borderTop: '1px solid var(--border)',
              fontSize: '0.714rem',
              color: 'var(--text-muted)',
              background: 'var(--surface-0)',
              textAlign: 'center',
            }}>
              {notifications.length} total notifications
            </div>
          )}
        </div>
      )}
    </div>
  );
}
