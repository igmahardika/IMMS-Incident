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
    <span className="font-mono tracking-tighter text-base-content/65 font-bold uppercase text-xs">
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
    <div className="navbar bg-base-100 h-14 min-h-[3.5rem] sticky top-0 z-40 px-4 transition-colors">
      <div className="navbar-start w-auto lg:w-1/2">
        <label htmlFor="main-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost lg:hidden mr-2">
          <Menu size={20} />
        </label>
        <div className="breadcrumbs text-xs hidden sm:block">
          <ul>
            <li><span className="text-base-content/65 tracking-wider font-bold uppercase">IMMS</span></li>
            {parts.map((p, i) => (
              <li key={i}>
                {i === parts.length - 1
                  ? <span className="font-semibold text-base-content uppercase tracking-tight">{TITLES[location.pathname] || p}</span>
                  : <span className="capitalize font-bold text-base-content/65">{p}</span>
                }
              </li>
            ))}
            {parts.length === 0 && <li><span className="font-semibold text-base-content uppercase tracking-tight">Dashboard</span></li>}
          </ul>
        </div>
      </div>

      <div className="navbar-center lg:hidden">
        <span className="font-semibold">{TITLES[location.pathname] || parts[parts.length - 1] || 'Dashboard'}</span>
      </div>

      <div className="navbar-end w-full lg:w-1/2 gap-2">
        <div className="hidden sm:flex items-center px-2">
          <LiveClock />
        </div>
        
        <label className="swap swap-rotate btn btn-ghost btn-circle btn-sm">
          <input type="checkbox" onChange={toggleTheme} checked={theme === 'dark'} />
          <Sun className="swap-on w-[18px] h-[18px]" />
          <Moon className="swap-off w-[18px] h-[18px]" />
        </label>
        
        <NotificationBell />

        <div className="badge badge-primary badge-soft badge-xs font-semibold tracking-wider gap-1.5 uppercase rounded h-6 px-2.5">
          <Shield size={10} />
          {user?.role}
        </div>
      </div>
    </div>
  );
}
