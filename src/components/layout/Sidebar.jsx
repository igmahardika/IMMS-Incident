import React, { useState, useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ThemeContext } from '../../App.jsx';
import {
  LayoutDashboard, AlertTriangle, PlusCircle, History, BarChart2,
  TrendingUp, Database, Tag, Users, UserCog, Settings, ChevronLeft, ChevronRight,
  Power, ListChecks, Zap, Network, Sun, Moon, X, HardHat, LogOut, Check
} from 'lucide-react';

const menuGroups = [
  {
    label: 'Monitoring',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'noc', 'technician'] },
    ]
  },
  {
    label: 'Tasks & Incidents',
    items: [
      { to: '/incidents', icon: AlertTriangle, label: 'Active Troubles', roles: ['admin', 'manager', 'noc', 'technician'] },
      { to: '/incidents/create', icon: PlusCircle, label: 'Create Incident', roles: ['admin', 'noc'] },
    ]
  },
  {
    label: 'Archives & Reports',
    items: [
      { to: '/history', icon: History, label: 'Resolved Incidents', roles: ['admin', 'manager', 'noc'] },
      { to: '/history/monthly', icon: ListChecks, label: 'Monthly Analysis', roles: ['admin', 'manager', 'noc'] },
    ]
  },
  {
    label: 'Analytics',
    items: [
      { to: '/analytics/duration', icon: BarChart2, label: 'Duration Report', roles: ['admin', 'manager', 'noc'] },
      { to: '/analytics/root-cause', icon: TrendingUp, label: 'Root Cause', roles: ['admin', 'manager', 'noc'] },
    ]
  },
  {
    label: 'Master Data',
    items: [
      { to: '/master/customers', icon: Database, label: 'Customer Records', roles: ['admin', 'manager'] },
      { to: '/master/classifications', icon: Tag, label: 'Classifications', roles: ['admin', 'manager'] },
      { to: '/master/technical-support', icon: HardHat, label: 'Personnel Records', roles: ['admin', 'manager'] },
      { to: '/master/distribusi', icon: Network, label: 'Distribution Topology', roles: ['admin', 'manager'] },
      { to: '/master/actions', icon: ListChecks, label: 'Master Actions (Handling)', roles: ['admin', 'manager'] },
      { to: '/master/users', icon: UserCog, label: 'User Accounts', roles: ['admin'] },
    ]
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings/escalation', icon: Settings, label: 'Escalation', roles: ['admin'] },
    ]
  },
];

export default function Sidebar({ mobileOpen, onClose }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirmLogout) {
      logout();
      navigate('/login');
    } else {
      setConfirmLogout(true);
      setTimeout(() => setConfirmLogout(false), 3000);
    }
  };

  const filteredGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.roles || item.roles.includes(user?.role))
    }))
    .filter(group => group.items.length > 0);

  return (
    <ul className="menu bg-base-100 text-base-content min-h-full w-60 p-2.5 flex flex-col flex-nowrap [&_li]:border-none">
      {/* Header/Logo strictly as a menu item without hover standard effects */}
      <li className="mb-4">
        <div className="flex items-center gap-3 p-2 bg-transparent hover:bg-transparent active:bg-transparent cursor-default">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-content">
            <Zap size={18} strokeWidth={1.5} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-lg leading-tight tracking-tighter text-base-content">IMMS</div>
            <div className="text-[9px] text-base-content/40 uppercase tracking-[0.2em] font-bold">Enterprise</div>
          </div>
        </div>
      </li>

      <div className="flex-1 overflow-y-auto w-full">
        {filteredGroups.map((group) => (
          <li key={group.label} className="mt-2.5 first:mt-0">
            <h2 className="menu-title text-[10px] font-bold uppercase text-base-content/40 tracking-[0.15em] mb-1">{group.label}</h2>
            <ul className="gap-0.5 bg-transparent w-full p-0">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `text-[13.5px] font-semibold py-2.5 md:py-1.5 transition-colors ${isActive ? 'active bg-primary/10 text-primary' : 'text-base-content/80 hover:bg-base-200'}`}
                    onClick={mobileOpen ? onClose : undefined}
                  >
                    <span className="flex items-center justify-center w-5 opacity-70"><item.icon size={18} md:size={16} strokeWidth={1.5} /></span>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </div>

      {/* Footer Profile section as a single list item */}
      <li className="mt-auto my-2 lg:block hidden"></li>
      <li className="mt-auto md:mt-2">
        <div className="flex items-center gap-3 bg-transparent hover:bg-base-200 active:bg-base-200 py-3 md:py-2 transition-colors">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-10 md:w-9">
              <span className="text-sm font-semibold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
             <div className="font-semibold truncate text-[14px] md:text-[13px] text-base-content">{user?.name}</div>
             <div className="text-[10px] md:text-[9px] text-base-content/40 uppercase tracking-[0.15em] font-bold">{user?.role}</div>
          </div>
          <button 
             onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleLogout(); }}
             className={`btn btn-md md:btn-sm btn-circle btn-ghost ${confirmLogout ? 'btn-error text-error-content hover:bg-error/90' : 'text-error'}`}
          >
             {confirmLogout ? <Check size={18} /> : <LogOut size={18} />}
          </button>
        </div>
      </li>
    </ul>
  );
}
