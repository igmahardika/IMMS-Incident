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
    <div className="navbar bg-base-100 border-b border-base-200 sticky top-0 z-40 px-4 min-h-[64px]">
      <div className="flex-none lg:hidden mr-2">
        <label htmlFor="main-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost btn-sm">
          <Menu size={20} />
        </label>
      </div>

      <div className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden">
        <div className="breadcrumbs text-sm h-full flex items-center">
          <ul>
            <li><span className="opacity-60 text-[10px] uppercase tracking-widest font-bold">IMMS</span></li>
            {parts.map((p, i) => (
              <li key={i}>
                {i === parts.length - 1
                  ? <span className="font-semibold text-base-content">{TITLES[location.pathname] || p}</span>
                  : <span className="capitalize">{p}</span>
                }
              </li>
            ))}
            {parts.length === 0 && <li><span className="font-semibold text-base-content">Dashboard</span></li>}
          </ul>
        </div>
      </div>

      <div className="flex-none gap-2 hidden sm:flex items-center">
        {/* Time */}
        <div className="text-xs font-mono font-medium opacity-70 px-2 mr-2">
          <LiveClock />
        </div>
        
        {/* Theme toggle */}
        <label className="swap swap-rotate btn btn-ghost btn-circle btn-sm">
          <input type="checkbox" onChange={toggleTheme} checked={theme === 'dark'} />
          <Sun className="swap-on w-[18px] h-[18px]" />
          <Moon className="swap-off w-[18px] h-[18px]" />
        </label>
        
        <NotificationBell />

        {/* Role badge */}
        <div className="badge badge-primary badge-soft badge-sm ml-2 font-bold tracking-widest gap-1 uppercase rounded-md h-7">
          <Shield size={12} />
          {user?.role}
        </div>
      </div>
    </div>
  );
}
