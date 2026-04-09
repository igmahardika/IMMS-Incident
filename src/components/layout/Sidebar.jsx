import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { cn } from '../../lib/utils.js';
import {
  LayoutDashboard, AlertTriangle, PlusCircle, History, BarChart2,
  TrendingUp, Database, Tag, Users, UserCog, Settings,
  Zap, ListChecks, Network, HardHat, LogOut, Check
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
    <aside className="w-56 flex flex-col h-full bg-background border-r border-foreground/5 shrink-0 overflow-hidden">
      {/* Header / Logo */}
      <div className="h-14 flex items-center gap-3 px-4 shrink-0 border-b border-foreground/5 relative">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
          <Zap size={15} strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm tracking-tight text-foreground leading-tight">IMMS</div>
          <div className="text-[9px] text-foreground/50 uppercase tracking-widest font-black">Enterprise</div>
        </div>
        {mobileOpen && (
          <button 
            className="lg:hidden p-1.5 text-foreground/50 hover:text-foreground hover:bg-foreground/5 rounded-md" 
            onClick={onClose}
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <Check size={18} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-5">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <h4 className="px-2 mb-1.5 text-[9px] font-black uppercase tracking-widest text-foreground/40">
              {group.label}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-all duration-200 group relative outline-none",
                    isActive 
                      ? "bg-primary/10 text-primary font-bold shadow-[inset_2px_0_0_0_var(--color-primary)]" 
                      : "text-foreground/75 hover:bg-foreground/5 hover:text-foreground font-medium"
                  )}
                  onClick={mobileOpen ? onClose : undefined}
                >
                  <span className={cn(
                    "flex items-center justify-center w-5 opacity-70 group-hover:opacity-100 transition-opacity",
                    confirmLogout && item.to === '/' ? "" : ""
                  )}>
                    <item.icon size={15} strokeWidth={2} />
                  </span>
                  <span className="text-[11px] leading-tight flex-1 line-clamp-1">{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer / Profile */}
      <div className="p-3 shrink-0 border-t border-foreground/5 bg-muted/20 pb-3">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer" onClick={(e) => { e.preventDefault(); handleLogout(); }}>
          <div className="w-8 h-8 rounded-full bg-foreground/10 text-foreground/70 flex items-center justify-center shrink-0 border border-border/50 shadow-sm">
            <span className="text-[11px] font-bold">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
          <div className="flex-1 min-w-0">
             <div className="text-xs font-bold text-foreground truncate leading-tight">{user?.name}</div>
             <div className="text-[9px] font-bold text-foreground/50 uppercase tracking-wider truncate">{user?.role}</div>
          </div>
          <button 
             className={cn(
               "p-1.5 rounded-md transition-colors",
               confirmLogout ? "text-error bg-error/10 hover:bg-error/20" : "text-foreground/40 hover:text-error hover:bg-error/10"
             )}
             aria-label={confirmLogout ? "Confirm Logout" : "Logout of system"}
             title={confirmLogout ? "Confirm Logout" : "Logout"}
          >
             {confirmLogout ? <Check size={14} strokeWidth={2.5} /> : <LogOut size={14} strokeWidth={2} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
