import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, Bell, CheckCheck, CheckCircle2, History, Info, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api.js';
import { formatDateTime } from '../../utils/incidentUtils.js';
import { cn } from '../../lib/utils.js';
import { Button } from './index.jsx';
import { socket } from '../../hooks/useSocket.js';

const POLL_INTERVAL = 60000;

function playNotificationSound() {
  try {
    const audio = new Audio('/notification.wav');
    audio.volume = 0.55;
    audio.play().catch(() => {});
  } catch {
    // Notification sound remains optional.
  }
}

function NotificationIcon({ message }) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('updated') || normalizedMessage.includes('memperbarui')) {
    return <History className="h-4 w-4 text-primary" />;
  }

  if (normalizedMessage.includes('created') || normalizedMessage.includes('baru')) {
    return <AlertCircle className="h-4 w-4 text-warning" />;
  }

  if (normalizedMessage.includes('closed') || normalizedMessage.includes('selesai')) {
    return <CheckCircle2 className="h-4 w-4 text-success" />;
  }

  return <Info className="h-4 w-4 text-muted-foreground" />;
}

function parseNotification(message) {
  const caseMatch = message.match(/#([CN]\d+)/);
  const detailIndex = message.indexOf(':');
  const userMatch = message.match(/^(?:Technician|Teknisi|User)\s+([^\s]+(?:\s+[^\s]+)?)/i);

  return {
    caseId: caseMatch ? caseMatch[1] : null,
    actor: userMatch ? userMatch[1] : 'System update',
    detail: detailIndex !== -1 ? message.slice(detailIndex + 1).trim() : message,
  };
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-muted/40 text-muted-foreground">
        <Bell className="h-4.5 w-4.5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">No notifications yet</p>
        <p className="text-sm text-muted-foreground">New incident updates will appear here.</p>
      </div>
    </div>
  );
}

function NotificationItem({ notification, onClick }) {
  const parsed = parseNotification(notification.message);
  const timeLabel = formatDateTime(notification.created_at);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors',
        notification.is_read
          ? 'border-transparent bg-transparent hover:border-border hover:bg-muted/40'
          : 'border-primary/15 bg-primary/5 hover:bg-primary/8'
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
          notification.is_read ? 'border-border bg-muted/40' : 'border-primary/20 bg-background'
        )}
      >
        <NotificationIcon message={notification.message} />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-medium text-foreground">{parsed.actor}</p>
              {parsed.caseId ? (
                <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  #{parsed.caseId}
                </span>
              ) : null}
            </div>
            <p className="line-clamp-2 text-sm leading-5 text-muted-foreground">{parsed.detail}</p>
          </div>

          {!notification.is_read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <span className="text-xs text-muted-foreground">{timeLabel}</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
            Open
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

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

      const currentIds = new Set(data.map((item) => item.id));
      const isFirstLoad = prevIdsRef.current.size === 0;

      if (!isFirstLoad) {
        const newItems = data.filter((item) => !prevIdsRef.current.has(item.id));
        if (newItems.length > 0) {
          playNotificationSound();
        }
      }

      prevIdsRef.current = currentIds;
      setUnread(data.filter((item) => !item.is_read).length);
    } catch {
      // Keep the topbar responsive if polling fails.
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const intervalId = window.setInterval(fetchNotifications, POLL_INTERVAL);
    return () => window.clearInterval(intervalId);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleNotificationsChanged = () => {
      fetchNotifications();
    };

    socket.on('notifications-changed', handleNotificationsChanged);
    return () => {
      socket.off('notifications-changed', handleNotificationsChanged);
    };
  }, [fetchNotifications]);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (event) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleMarkAllRead = async () => {
    try {
      const unreadItems = notifications.filter((item) => !item.is_read);
      await Promise.all(unreadItems.map((item) => api.markNotificationRead(item.id)));
      fetchNotifications();
    } catch {
      // Ignore failures to keep panel usable.
    }
  };

  const handleOpenNotification = async (notification) => {
    await api.markNotificationRead(notification.id).catch(() => {});
    setOpen(false);

    if (notification.incident_id) {
      navigate(`/incidents/${notification.incident_id}`);
    }

    fetchNotifications();
  };

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => setOpen((previous) => !previous)}
        aria-label="Open notifications"
        title="Notifications"
        className={cn('relative', open && 'bg-accent text-accent-foreground')}
      >
        <Bell className={cn('h-4 w-4', unread > 0 && 'text-primary')} />
        {unread > 0 ? (
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        ) : null}
      </Button>

      <div
        ref={panelRef}
        className={cn(
          'absolute right-0 top-full z-[2000] mt-2 w-96 max-w-[calc(100vw-32px)] origin-top-right overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg transition-all duration-150',
          open ? 'visible scale-100 opacity-100' : 'invisible scale-95 opacity-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-xs text-muted-foreground">
              {unread > 0 ? `${unread} unread update${unread > 1 ? 's' : ''}` : 'All updates are read'}
            </p>
          </div>

          {unread > 0 ? (
            <Button type="button" variant="ghost" size="sm" onClick={handleMarkAllRead} className="gap-2 px-2.5">
              <CheckCheck className="h-4 w-4" />
              Mark all
            </Button>
          ) : null}
        </div>

        <div className="custom-scrollbar max-h-[460px] overflow-y-auto p-3">
          {notifications.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleOpenNotification(notification)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
