import React, { useEffect, useState, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ThemeContext } from '../../App.jsx';
import { SidebarContext } from './AppLayout.jsx';
import { Shield, Menu, Sun, Moon } from 'lucide-react';
import NotificationBell from '../ui/NotificationBell.jsx';

const TITLES = {
  '/': 'Dashboard',
  '/incidents': 'Current Trouble',
  '/incidents/create': 'Create Incident',
  '/history': 'Done Incidents',
  '/history/monthly': 'Monthly View',
  '/analytics/duration': 'Duration Report',
  '/analytics/root-cause': 'Root Cause Analysis',
  '/master/customers': 'Master Customer',
  '/master/classifications': 'Klasifikasi',
  '/master/technical-support': 'Personel Data',
  '/master/distribusi': 'Distribusi Tree',
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
    <span className="topbar-time">
      {time.toLocaleString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} WIB
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
    <header className="topbar">
      <div className="topbar-left">
        {/* Mobile hamburger */}
        <button
          className="hamburger-btn"
          onClick={() => setMobileOpen(v => !v)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <span>IMMS</span>
          {parts.map((p, i) => (
            <React.Fragment key={i}>
              <span className="breadcrumb-sep">›</span>
              {i === parts.length - 1
                ? <span className="breadcrumb-current">{TITLES[location.pathname] || p}</span>
                : <span style={{ textTransform: 'capitalize' }}>{p}</span>
              }
            </React.Fragment>
          ))}
          {parts.length === 0 && <span className="breadcrumb-current">Dashboard</span>}
        </nav>
      </div>

      <div className="topbar-right">
        {/* Time — hide on small mobile */}
        <span style={{ display: 'none' }} className="topbar-time-desktop">
          <LiveClock />
        </span>
        <LiveClock />

        {/* Notification Bell */}
        <NotificationBell />

        {/* Theme toggle (visible in topbar on mobile, sidebar has one for desktop) */}
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Role badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-subtle)', border: '1px solid var(--border-focus)', borderRadius: 'var(--radius-xs)', padding: '0.25rem 0.625rem' }}>
          <Shield size={11} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.714rem', fontWeight: 700, color: 'var(--accent-light)', letterSpacing: '0.04em' }}>{user?.role?.toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}
