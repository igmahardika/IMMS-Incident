import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, ExternalLink, CheckCheck, User, AlertCircle, CheckCircle2, History, Info } from 'lucide-react';
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

const NotificationIcon = ({ message }) => {
  const msg = message.toLowerCase();
  if (msg.includes('updated') || msg.includes('memperbarui')) return <History size={18} className="text-primary" />;
  if (msg.includes('created') || msg.includes('baru')) return <AlertCircle size={18} className="text-warning" />;
  if (msg.includes('closed') || msg.includes('selesai')) return <CheckCircle2 size={18} className="text-success" />;
  return <Info size={18} className="text-base-content/40" />;
};

const parseNotification = (message) => {
  const caseMatch = message.match(/#([CN]\d+)/);
  const userMatch = message.match(/^(?:Technician|Teknisi|User)\s+([^\s]+ [^\s]+)/i);
  const detailIndex = message.indexOf(':');
  
  return {
    caseId: caseMatch ? caseMatch[1] : null,
    user: userMatch ? userMatch[1] : 'System Update',
    detail: detailIndex !== -1 ? message.substring(detailIndex + 1).trim() : message,
    isTechAction: message.toLowerCase().includes('technician') || message.toLowerCase().includes('teknisi')
  };
};

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
  };  return (
    <div className={`dropdown dropdown-end ${open ? 'dropdown-open' : ''}`} ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        className="btn btn-ghost btn-circle btn-sm relative z-50 focus:outline-none"
        aria-label="Notifications"
        title="Notifications"
        onClick={() => setOpen(!open)}
      >
        <Bell size={18} className={unread > 0 ? 'text-primary' : 'opacity-60'} />
        {unread > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error border border-base-100 animate-pulse" />
        )}
      </button>

      {/* Dropdown Panel */}
      <div 
        className={`dropdown-content z-[2000] p-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-base-100/95 backdrop-blur-xl rounded-2xl w-80 md:w-[400px] max-w-[calc(100vw-32px)] mt-3 overflow-hidden flex flex-col max-h-[520px] border border-base-content/5 transition-all duration-200 ${
          open 
          ? 'opacity-100 translate-y-0 pointer-events-auto visible' 
          : 'opacity-0 -translate-y-2 pointer-events-none invisible'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between w-full px-5 py-4 border-b border-base-content/5 bg-base-100/50 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-xs tracking-wider text-base-content/40 uppercase">
              Recent Updates
            </span>
            {unread > 0 && (
              <span className="badge badge-primary badge-sm font-semibold text-xs h-5 rounded-md px-1.5 animate-pulse">
                {unread} NEW
              </span>
            )}
          </div>
          <div className="flex items-center">
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn btn-ghost btn-xs text-xs font-medium uppercase tracking-wider gap-1.5 text-primary hover:bg-primary/10 rounded-md"
                title="Mark all as read"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-24 px-8 text-center opacity-30 flex flex-col items-center gap-5">
              <div className="w-16 h-16 rounded-[2rem] bg-base-200 flex items-center justify-center rotate-12 transition-transform hover:rotate-0">
                <Bell size={32} strokeWidth={1} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium uppercase tracking-widest text-base-content/60">No Updates</span>
                <span className="text-xs font-medium opacity-50">Operational logs are up to date</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col p-2 space-y-2">
              {notifications.map(n => {
                const parsed = parseNotification(n.message);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClickNotif(n)}
                    className={`card card-compact overflow-hidden border border-base-content/5 cursor-pointer transition-all duration-300 hover:shadow-md hover:bg-base-200/50 ${
                      n.is_read 
                      ? 'bg-base-100 opacity-70' 
                      : 'bg-primary/5 shadow-sm border-primary/10'
                    }`}
                  >
                    {/* Card Content */}
                    <div className="card-body p-3 relative">
                      {/* Unread indicator accent bar */}
                      {!n.is_read && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_8px_rgba(var(--p),0.3)]" />
                      )}

                      <div className="flex items-start gap-3">
                        {/* Avatar-like Icon Area */}
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-base-content/5 ${!n.is_read ? 'bg-primary/10 text-primary' : 'bg-base-200 opacity-60'}`}>
                          <NotificationIcon message={n.message} />
                        </div>

                        {/* Enriched Details */}
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <div className="flex justify-between items-center">
                            <span className={`card-title text-sm leading-none ${n.is_read ? 'text-base-content/60' : 'text-primary'}`}>
                              {parsed.user}
                            </span>
                            <span className="text-xs font-mono font-semibold opacity-30 tracking-tight shrink-0 uppercase">
                               {formatDateTime(n.created_at).split(',')[1]?.trim() || '—'}
                            </span>
                          </div>

                          <p className={`text-sm leading-tight line-clamp-2 ${n.is_read ? 'text-base-content/40' : 'text-base-content/80 font-medium'}`}>
                            {parsed.caseId && <span className="font-bold mr-1.5 text-xs opacity-70">#{parsed.caseId}</span>}
                            {parsed.detail}
                          </p>

                          <div className={`flex items-center justify-between pt-1 opacity-0 group-hover:opacity-100 transition-opacity ${!n.is_read ? 'opacity-100' : ''}`}>
                             <span className="text-xs font-medium text-primary uppercase tracking-wide flex items-center gap-1 hover:underline">
                                Details <ExternalLink size={10} />
                             </span>
                             {!n.is_read && <span className="badge badge-primary badge-xs font-semibold text-xs h-4 rounded-sm animate-pulse-slow">Unread</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-5 py-3 bg-base-200/30 text-center">
            <span className="text-xs font-semibold text-base-content/30 tracking-wider uppercase">
              End of notifications
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
