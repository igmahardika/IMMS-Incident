import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock3, Menu, Moon, Shield, Sun } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ThemeContext } from '../../App.jsx';
import { cn } from '../../lib/utils.js';
import { Button } from '../ui/index.jsx';
import NotificationBell from '../ui/NotificationBell.jsx';
import { SidebarContext } from './AppLayout.jsx';

const TITLES = {
  '/': 'Dashboard',
  '/incidents': 'Active Troubles',
  '/incidents/create': 'Create Incident',
  '/history': 'Resolved Incidents',
  '/history/monthly': 'Monthly Analysis',
  '/analytics/duration': 'Duration Report',
  '/analytics/root-cause': 'Root Cause Analysis',
  '/master/customers': 'Customer Master',
  '/master/classifications': 'Classifications',
  '/master/technical-support': 'Personnel Records',
  '/master/distribusi': 'Distribution Topology',
  '/master/users': 'User Management',
  '/master/actions': 'Master Actions',
  '/settings/escalation': 'Escalation Settings',
};

const ROLE_BADGE_STYLES = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  manager: 'bg-secondary/20 text-secondary-foreground border-secondary/20',
  noc: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400',
  technician: 'bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400',
};

function formatSegment(segment) {
  return segment.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => setTime(new Date()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const dayLabel = time.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
  const dateLabel = time.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeLabel = time.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="hidden items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground lg:flex">
      <Clock3 className="h-3.5 w-3.5" />
      <span className="font-medium uppercase tracking-[0.12em]">
        {dayLabel}, {dateLabel}
      </span>
      <span className="font-semibold text-foreground">{timeLabel}</span>
      <span>WIB</span>
    </div>
  );
}

export default function Topbar() {
  const { user } = useAuth();
  const { theme, toggle: toggleTheme } = useContext(ThemeContext);
  const { setMobileOpen } = useContext(SidebarContext);
  const location = useLocation();

  const breadcrumbItems = useMemo(() => {
    const parts = location.pathname.split('/').filter(Boolean);

    if (parts.length === 0) {
      return [{ label: 'Dashboard', current: true }];
    }

    return parts.map((part, index) => {
      const path = `/${parts.slice(0, index + 1).join('/')}`;
      const isCurrent = index === parts.length - 1;
      const label = isCurrent ? (TITLES[path] || formatSegment(part)) : formatSegment(part);

      return { label, current: isCurrent };
    });
  }, [location.pathname]);

  const pageTitle = breadcrumbItems[breadcrumbItems.length - 1]?.label || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="min-w-0 space-y-1">
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              IMMS
            </span>

            {breadcrumbItems.map((item, index) => (
              <React.Fragment key={`${item.label}-${index}`}>
                <span className="text-muted-foreground/60">/</span>
                <span
                  className={cn(
                    'truncate text-sm',
                    item.current ? 'font-medium text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {item.label}
                </span>
              </React.Fragment>
            ))}
          </div>

          <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:hidden">
            {pageTitle}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <LiveClock />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        <NotificationBell />

        <div
          className={cn(
            'hidden h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium uppercase tracking-[0.14em] sm:flex',
            ROLE_BADGE_STYLES[user?.role] || 'border-primary/20 bg-primary/10 text-primary'
          )}
        >
          <Shield className="h-3.5 w-3.5" />
          <span>{user?.role || 'user'}</span>
        </div>
      </div>
    </header>
  );
}
