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
  };  return (
    <div className="dropdown dropdown-end" ref={panelRef}>
      {/* Bell Button */}
      <button
        tabIndex={0}
        className="btn btn-ghost btn-circle btn-sm relative"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={18} className={unread > 0 ? 'text-primary' : 'opacity-60'} />
        {unread > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-error border border-base-100 animate-pulse" />
        )}
      </button>

      {/* Dropdown Panel */}
      <div tabIndex={0} className="dropdown-content z-[2000] menu p-0 shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-base-100/95 backdrop-blur-xl rounded-2xl w-80 md:w-[400px] mt-3 overflow-hidden flex flex-col max-h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-base-100/50">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-[10px] tracking-[0.15em] text-base-content/40 uppercase">
              Recent Updates
            </span>
            {unread > 0 && (
              <span className="badge badge-primary badge-sm font-bold text-[9px] h-5 rounded-md px-1.5 animate-pulse">
                {unread} NEW
              </span>
            )}
          </div>
          <div className="flex items-center">
            {unread > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="btn btn-ghost btn-xs text-[9px] font-bold uppercase tracking-[0.15em] gap-1.5 text-primary hover:bg-primary/10 rounded-md"
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
            <div className="py-16 px-6 text-center opacity-30 flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-base-200 flex items-center justify-center">
                <Bell size={24} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em]">No notifications yet</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 p-3">
              {notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => handleClickNotif(n)}
                  className={`group relative flex flex-col gap-2 p-4 rounded-xl cursor-pointer transition-all duration-300 ${
                    n.is_read 
                    ? 'bg-transparent text-base-content/50 hover:bg-base-content/5' 
                    : 'bg-primary/5 text-base-content shadow-sm hover:bg-primary/10'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className={`text-[13.5px] leading-relaxed tracking-tight ${n.is_read ? 'font-medium' : 'font-bold text-base-content'}`}>
                      {n.message}
                    </span>
                    {n.incident_id && (
                      <ExternalLink size={12} className="text-base-content/20 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono font-bold text-base-content/30 uppercase tracking-[0.15em]">
                        {formatDateTime(n.created_at)}
                      </span>
                    </div>
                    {!n.is_read && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-bold text-primary uppercase tracking-[0.15em]">New</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--p),0.5)]" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="px-5 py-3 bg-base-200/30 text-center">
            <span className="text-[10px] font-bold text-base-content/30 tracking-[0.15em] uppercase">
              End of notifications
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
