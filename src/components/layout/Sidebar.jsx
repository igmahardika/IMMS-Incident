import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart2,
  Database,
  History,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Network,
  PlusCircle,
  Settings,
  Shield,
  Tag,
  UserCog,
  X,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { cn } from '../../lib/utils.js';
import { Button } from '../ui/index.jsx';

const menuGroups = [
  {
    label: 'Monitoring',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'noc', 'technician'] },
    ],
  },
  {
    label: 'Tasks & Incidents',
    items: [
      { to: '/incidents', icon: AlertTriangle, label: 'Active Troubles', roles: ['admin', 'manager', 'noc', 'technician'] },
      { to: '/incidents/create', icon: PlusCircle, label: 'Create Incident', roles: ['admin', 'noc'] },
    ],
  },
  {
    label: 'Archives & Reports',
    items: [
      { to: '/history', icon: History, label: 'Resolved Incidents', roles: ['admin', 'manager', 'noc'] },
      { to: '/history/monthly', icon: ListChecks, label: 'Monthly Analysis', roles: ['admin', 'manager', 'noc'] },
    ],
  },
  {
    label: 'Analytics',
    items: [
      { to: '/analytics/duration', icon: BarChart2, label: 'Duration Report', roles: ['admin', 'manager', 'noc'] },
      { to: '/analytics/root-cause', icon: TrendingUp, label: 'Root Cause', roles: ['admin', 'manager', 'noc'] },
    ],
  },
  {
    label: 'Master Data',
    items: [
      { to: '/master/customers', icon: Database, label: 'Customer Records', roles: ['admin', 'manager'] },
      { to: '/master/classifications', icon: Tag, label: 'Classifications', roles: ['admin', 'manager'] },
      { to: '/master/distribusi', icon: Network, label: 'Distribution Topology', roles: ['admin', 'manager'] },
      { to: '/master/users', icon: UserCog, label: 'Personnel & Accounts', roles: ['admin', 'manager'] },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings/escalation', icon: Settings, label: 'Escalation Config', roles: ['admin'] },
    ],
  },
];

function getInitials(name) {
  const parts = (name || 'User').trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'U';
}

function formatRole(role) {
  return role ? role.replace(/_/g, ' ') : 'user';
}

export default function Sidebar({ mobileOpen = false, onClose }) {
  const [confirmLogout, setConfirmLogout] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!confirmLogout) return undefined;

    const timeoutId = window.setTimeout(() => setConfirmLogout(false), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [confirmLogout]);

  const filteredGroups = useMemo(
    () => menuGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.roles || item.roles.includes(user?.role)),
      }))
      .filter((group) => group.items.length > 0),
    [user?.role]
  );

  const handleLogout = async () => {
    if (!confirmLogout) {
      setConfirmLogout(true);
      return;
    }

    await logout();
    navigate('/login');
  };

  return (
    <aside className="flex h-full w-64 max-w-64 shrink-0 flex-col border-r border-border bg-background">
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border">
            <img
              src="/branding/nexaris-mark.png"
              alt="Nexaris logo"
              className="h-5 w-5 object-contain"
            />
          </div>

          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-semibold tracking-tight text-foreground">
              Nexaris
            </p>
            <p className="truncate text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Nexa Incident Ops
            </p>
          </div>
        </div>

        {mobileOpen ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {filteredGroups.map((group) => (
          <div key={group.label} className="space-y-2">
            <div className="px-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {group.label}
              </p>
            </div>

            <div className="space-y-1">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => cn(
                    'group flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                  onClick={mobileOpen ? onClose : undefined}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-foreground' : 'text-muted-foreground'
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {isActive ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" /> : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
              {getInitials(user?.name)}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.name || 'System User'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span className="truncate capitalize">{formatRole(user?.role)}</span>
              </div>
            </div>

            <Button
              type="button"
              variant={confirmLogout ? 'destructive' : 'ghost'}
              size="icon"
              className="shrink-0"
              onClick={handleLogout}
              aria-label={confirmLogout ? 'Confirm logout' : 'Logout'}
              title={confirmLogout ? 'Click again to confirm logout' : 'Logout'}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {confirmLogout ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Klik sekali lagi untuk keluar dari sesi ini.
            </p>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
