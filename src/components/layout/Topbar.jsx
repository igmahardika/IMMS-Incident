import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ThemeContext } from '../../App.jsx';
import { SidebarContext } from './AppLayout.jsx';
import { Shield, Menu, Sun, Moon } from 'lucide-react';
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
  '/settings/escalation': 'Escalation Settings',
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="font-mono tabular-nums tracking-tighter text-foreground/60 font-medium uppercase text-[11px]">
      {time.toLocaleDateString('en-GB', { weekday: 'short' })}, {String(time.getDate()).padStart(2, '0')}/{String(time.getMonth() + 1).padStart(2, '0')}/{time.getFullYear()} {String(time.getHours()).padStart(2, '0')}:{String(time.getMinutes()).padStart(2, '0')} WIB
    </span>
  );
}

export default function Topbar() {
  const { user } = useAuth();
  const { theme, toggle: toggleTheme } = useContext(ThemeContext);
  const { setMobileOpen } = useContext(SidebarContext);
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-foreground/5 bg-background shrink-0 w-full relative z-30">
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Toggle */}
        <button 
          className="lg:hidden p-1.5 -ml-1.5 rounded-md hover:bg-foreground/5 text-foreground/70 transition-colors"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar menu"
          title="Open menu"
        >
          <Menu size={18} strokeWidth={2} />
        </button>

        {/* Global Breadcrumbs */}
        <div className="hidden sm:flex items-center gap-2 text-[11px]">
          <span className="text-foreground/40 font-bold uppercase tracking-widest">IMMS</span>
          <span className="text-foreground/20 font-light">/</span>
          {parts.length === 0 ? (
            <span className="font-bold text-foreground">Dashboard</span>
          ) : (
            parts.map((p, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="text-foreground/20 font-light">/</span>}
                {i === parts.length - 1 ? (
                  <span className="font-bold text-foreground">{TITLES[location.pathname] || p.replace(/-/g, ' ')}</span>
                ) : (
                  <span className="capitalize font-semibold text-foreground/60">{p.replace(/-/g, ' ')}</span>
                )}
              </React.Fragment>
            ))
          )}
        </div>

        {/* Mobile Title */}
        <div className="sm:hidden font-bold text-sm">
           {TITLES[location.pathname] || (parts.length > 0 ? parts[parts.length - 1].replace(/-/g, ' ') : 'Dashboard')}
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        {/* Live Clock */}
        <div className="hidden md:block">
          <LiveClock />
        </div>
        
        {/* Theme Toggle Native */}
        <button 
          className="p-1.5 rounded-md text-foreground/60 hover:text-foreground hover:bg-foreground/5 transition-colors flex items-center justify-center relative w-7 h-7"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
           <span className="absolute inset-0 flex items-center justify-center transition-all duration-300">
             {theme === 'dark' ? <Moon size={15} /> : <Sun size={15} />}
           </span>
        </button>
        
        {/* Notification component (will be refactored next) */}
        <NotificationBell />

        {/* Role Badge */}
        <div className="h-6 px-2 flex items-center gap-1.5 rounded-md bg-primary/10 text-primary border border-primary/20 ml-2">
          <Shield size={11} strokeWidth={2.5} />
          <span className="text-[10px] font-bold tracking-widest uppercase">{user?.role}</span>
        </div>
      </div>
    </header>
  );
}
