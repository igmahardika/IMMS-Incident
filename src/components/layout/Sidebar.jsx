import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { cn } from '../../lib/utils.js';
import {
  LayoutDashboard, AlertTriangle, PlusCircle, History, BarChart2,
  TrendingUp, Database, Tag, Users, UserCog, Settings,
  Zap, ListChecks, Network, HardHat, LogOut, X
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
      { to: '/master/actions', icon: ListChecks, label: 'Master Actions', roles: ['admin', 'manager'] },
      { to: '/master/users', icon: UserCog, label: 'User Accounts', roles: ['admin'] },
    ]
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings/escalation', icon: Settings, label: 'Escalation Config', roles: ['admin'] },
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
    <aside className="w-60 flex flex-col h-full bg-background border-r border-foreground/[0.06] shrink-0 overflow-hidden">
      
      {/* ── Logo / Brand Header ── */}
      <div className="h-[56px] flex items-center gap-3 px-4 shrink-0 border-b border-foreground/[0.06]">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 shrink-0">
          <Zap size={16} strokeWidth={2.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-[13px] tracking-tight text-foreground leading-none">IMMS</div>
          <div className="text-[9px] text-foreground/40 uppercase tracking-[0.2em] font-bold mt-0.5">Enterprise NOC</div>
        </div>
        {mobileOpen && (
          <button
            className="lg:hidden p-1.5 text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* ── Navigation Groups ── */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar py-3 px-2.5">
        <div className="space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.label}>
              {/* Section Label */}
              <div className="px-2.5 mb-1 flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 whitespace-nowrap">
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-foreground/[0.06]" />
              </div>

              {/* Nav Items */}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => cn(
                      "flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all duration-150 group relative outline-none",
                      isActive
                        ? "bg-primary/10 text-primary font-bold"
                        : "text-foreground/60 hover:bg-foreground/[0.05] hover:text-foreground/90 font-medium"
                    )}
                    onClick={mobileOpen ? onClose : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active left-bar indicator */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                        )}

                        {/* Icon */}
                        <span className={cn(
                          "flex items-center justify-center w-[18px] shrink-0 transition-all",
                          isActive ? "text-primary" : "text-foreground/40 group-hover:text-foreground/70"
                        )}>
                          <item.icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                        </span>

                        {/* Label */}
                        <span className="text-[11px] leading-tight flex-1 truncate">
                          {item.label}
                        </span>

                        {/* Active dot */}
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Footer / User Profile ── */}
      <div className="shrink-0 border-t border-foreground/[0.06] p-2.5">
        <div
          className="flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg hover:bg-foreground/[0.04] transition-colors cursor-pointer group"
          onClick={handleLogout}
        >
          {/* Avatar */}
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <span className="text-[12px] font-black">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-foreground truncate leading-tight">{user?.name}</div>
            <div className="text-[9px] font-black text-foreground/40 uppercase tracking-widest truncate mt-0.5">{user?.role}</div>
          </div>

          {/* Logout Icon */}
          <button
            className={cn(
              "p-1.5 rounded-md transition-all shrink-0",
              confirmLogout
                ? "text-error bg-error/10 animate-pulse"
                : "text-foreground/30 group-hover:text-error group-hover:bg-error/10"
            )}
            aria-label={confirmLogout ? "Confirm Logout" : "Logout"}
            title={confirmLogout ? "Click again to confirm logout" : "Logout"}
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
          >
            <LogOut size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}
