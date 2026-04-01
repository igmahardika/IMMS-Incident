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
  const [collapsed, setCollapsed] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggle: toggleTheme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirmLogout) {
      logout();
      navigate('/login');
    } else {
      setConfirmLogout(true);
      // Auto-reset confirm state after 3s if user doesn't click again
      setTimeout(() => setConfirmLogout(false), 3000);
    }
  };

  const filteredGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.roles || item.roles.includes(user?.role))
    }))
    .filter(group => group.items.length > 0);

  const isCollapsed = collapsed && !mobileOpen;

  return (
    <aside className="w-64 min-h-full bg-base-300 text-base-content flex flex-col shadow-xl">
      {/* Header/Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-base-200 min-h-[64px]">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-content">
          <Zap size={18} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-lg leading-tight tracking-tight">IMMS</div>
          <div className="text-xs opacity-60 uppercase tracking-widest font-semibold">Incident Mgmt</div>
        </div>
      </div>

      {/* Nav using daisyUI menu */}
      <ul className="menu menu-md px-4 py-4 flex-1 overflow-y-auto w-full">
        {filteredGroups.map((group) => (
          <li key={group.label} className="mt-4 first:mt-0">
            <h2 className="menu-title text-[10px] uppercase opacity-50 tracking-widest">{group.label}</h2>
            <ul>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `${isActive ? 'active' : ''}`}
                    onClick={mobileOpen ? onClose : undefined}
                  >
                    <item.icon size={18} strokeWidth={1.5} />
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div className="p-4 border-t border-base-200 bg-base-300">
        <div className="flex items-center gap-3">
          <div className="avatar placeholder">
            <div className="bg-neutral text-neutral-content rounded-full w-9">
              <span className="text-sm font-semibold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
             <div className="font-bold truncate text-sm">{user?.name}</div>
             <div className="text-[10px] opacity-60 uppercase tracking-wider font-semibold">{user?.role}</div>
          </div>
          <button 
             onClick={handleLogout}
             className={`btn btn-sm btn-circle btn-ghost ${confirmLogout ? 'btn-error text-error-content hover:bg-error/90' : 'text-error'}`}
          >
             {confirmLogout ? <Check size={16} /> : <LogOut size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
