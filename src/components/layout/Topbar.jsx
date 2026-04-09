import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ThemeContext } from '../../App.jsx';
import { SidebarContext } from './AppLayout.jsx';
import { Shield, Menu, Sun, Moon, Clock } from 'lucide-react';
import NotificationBell from '../ui/NotificationBell.jsx';
import { cn } from '../../lib/utils.js';

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

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  return (
    <div className="hidden md:flex items-center gap-2 text-foreground/50">
      <Clock size={12} strokeWidth={2} className="text-foreground/30" />
      <span className="font-mono tabular-nums text-[11px] font-semibold tracking-wider">
        {days[time.getDay()]}, {pad(time.getDate())}/{pad(time.getMonth() + 1)}/{time.getFullYear()}{' '}
        <span className="text-foreground/70 font-bold">
          {pad(time.getHours())}:{pad(time.getMinutes())}
        </span>{' '}
        <span className="text-[9px] font-black tracking-widest text-foreground/30">WIB</span>
      </span>
    </div>
  );
}

export default function Topbar() {
  const { user } = useAuth();
  const { theme, toggle: toggleTheme } = useContext(ThemeContext);
  const { setMobileOpen } = useContext(SidebarContext);
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  const pageTitle = TITLES[location.pathname] || (parts.length > 0
    ? parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Dashboard'
  );

  const ROLE_COLORS = {
    admin: 'bg-primary/10 text-primary border-primary/20',
    manager: 'bg-secondary/10 text-secondary border-secondary/20',
    noc: 'bg-success/10 text-success border-success/20',
    technician: 'bg-warning/10 text-warning border-warning/20',
  };

  return (
    <header className="h-[56px] flex items-center justify-between px-4 border-b border-foreground/[0.06] bg-background shrink-0 w-full relative z-30">
      
      {/* ── Left: Mobile Toggle + Breadcrumbs ── */}
      <div className="flex items-center gap-3">
        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-foreground/[0.05] text-foreground/60 transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar menu"
        >
          <Menu size={17} strokeWidth={2} />
        </button>

        {/* Desktop Breadcrumb */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold">
          <span className="text-foreground/30 uppercase tracking-[0.15em] font-bold text-[10px]">IMMS</span>
          {parts.length === 0 ? (
            <>
              <span className="text-foreground/20 mx-0.5">›</span>
              <span className="font-bold text-foreground">Dashboard</span>
            </>
          ) : (
            parts.map((p, i) => (
              <React.Fragment key={i}>
                <span className="text-foreground/20 mx-0.5">›</span>
                {i === parts.length - 1 ? (
                  <span className="font-bold text-foreground">{pageTitle}</span>
                ) : (
                  <span className="text-foreground/50 capitalize font-semibold tracking-wide">
                    {p.replace(/-/g, ' ')}
                  </span>
                )}
              </React.Fragment>
            ))
          )}
        </div>

        {/* Mobile: just show current page title */}
        <div className="sm:hidden font-bold text-sm text-foreground">{pageTitle}</div>
      </div>

      {/* ── Right: Controls ── */}
      <div className="flex items-center gap-1 lg:gap-3">
        {/* Live Clock */}
        <LiveClock />

        {/* Divider */}
        <div className="hidden md:block w-px h-4 bg-foreground/10 mx-1" />

        {/* Theme Toggle */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/[0.05] transition-all"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark'
            ? <Moon size={14} strokeWidth={2} />
            : <Sun size={15} strokeWidth={2} />
          }
        </button>

        {/* Notifications */}
        <NotificationBell />

        {/* Role Badge */}
        <div className={cn(
          "hidden sm:flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-[10px] font-black tracking-widest uppercase ml-1",
          ROLE_COLORS[user?.role] || 'bg-primary/10 text-primary border-primary/20'
        )}>
          <Shield size={10} strokeWidth={2.5} />
          <span>{user?.role}</span>
        </div>
      </div>
    </header>
  );
}
