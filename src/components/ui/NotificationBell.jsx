import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, ExternalLink, CheckCheck, User, AlertCircle, CheckCircle2, History, Info } from 'lucide-react';
import { api } from '../../utils/api.js';
import { formatDateTime } from '../../utils/incidentUtils.js';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils.js';

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
  if (msg.includes('updated') || msg.includes('memperbarui')) return <History size={15} className="text-primary" />;
  if (msg.includes('created') || msg.includes('baru')) return <AlertCircle size={15} className="text-warning" />;
  if (msg.includes('closed') || msg.includes('selesai')) return <CheckCircle2 size={15} className="text-success" />;
  return <Info size={15} className="text-foreground/40" />;
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
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);

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

  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && buttonRef.current && !buttonRef.current.contains(e.target)) {
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
    <div className="relative inline-block">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center transition-all relative",
          open ? "bg-foreground/[0.08] text-foreground" : "text-foreground/50 hover:text-foreground hover:bg-foreground/[0.05]"
        )}
        aria-label="Notifications"
        title="Notifications"
        onClick={() => setOpen(!open)}
      >
        <Bell size={14} strokeWidth={2} className={unread > 0 ? 'text-primary' : ''} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-error border border-background" />
        )}
      </button>

      {/* Dropdown Panel */}
      <div 
        ref={panelRef}
        className={cn(
          "absolute right-0 top-full mt-2 z-[2000] shadow-[0_20px_60px_rgba(0,0,0,0.2)] bg-background/98 backdrop-blur-xl rounded-xl w-80 md:w-[360px] max-w-[calc(100vw-24px)] overflow-hidden flex flex-col max-h-[460px] border border-foreground/[0.08] transition-all duration-200 origin-top-right",
          open 
            ? 'opacity-100 scale-100 pointer-events-auto visible' 
            : 'opacity-0 scale-95 pointer-events-none hidden'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-foreground/5 bg-foreground/5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[10px] tracking-widest text-foreground/50 uppercase">
              Recent Updates
            </span>
            {unread > 0 && (
              <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                {unread} NEW
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
              title="Mark all as read"
            >
              <CheckCheck size={12} />
              Read All
            </button>
          )}
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-16 px-6 text-center text-foreground/30 flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-foreground/5 flex items-center justify-center">
                <Bell size={20} strokeWidth={1.5} />
              </div>
              <span className="text-[11px] font-medium uppercase tracking-widest text-foreground/50">No new updates</span>
            </div>
          ) : (
            <div className="flex flex-col p-1.5 space-y-1 relative">
              {notifications.map((n, idx) => {
                const parsed = parseNotification(n.message);
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClickNotif(n)}
                    className={cn(
                      "flex gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 relative group border border-transparent",
                      n.is_read 
                        ? 'hover:bg-foreground/5 opacity-70 hover:opacity-100' 
                        : 'bg-primary/5 border-primary/10'
                    )}
                  >
                    {/* Unread Indicator */}
                    {!n.is_read && (
                      <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-sm bg-primary" />
                    )}

                    {/* Icon Area */}
                    <div className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center shrink-0 border border-foreground/5",
                      n.is_read ? 'bg-muted text-foreground/50' : 'bg-primary/10'
                    )}>
                      <NotificationIcon message={n.message} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                      <div className="flex justify-between items-start">
                        <span className={cn(
                          "text-[11px] font-bold leading-tight line-clamp-1 flex-1",
                          n.is_read ? 'text-foreground/70' : 'text-primary'
                        )}>
                          {parsed.user}
                        </span>
                        <span className="text-[9px] font-mono font-bold text-foreground/40 shrink-0 tabular-nums">
                           {formatDateTime(n.created_at).split(',')[1]?.trim() || '—'}
                        </span>
                      </div>

                      <p className={cn(
                        "text-[11px] leading-snug line-clamp-2",
                        n.is_read ? 'text-foreground/60' : 'text-foreground/90 font-medium'
                      )}>
                        {parsed.caseId && <span className="font-bold mr-1 opacity-70">#{parsed.caseId}</span>}
                        {parsed.detail}
                      </p>

                      {!n.is_read && (
                        <div className="text-[9px] font-bold uppercase tracking-wider text-primary mt-0.5 opacity-60">
                           New Activity
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 bg-foreground/5 text-center border-t border-foreground/5 shrink-0">
            <span className="text-[9px] font-bold text-foreground/40 tracking-widest uppercase">
              End of list
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
