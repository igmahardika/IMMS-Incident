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
    <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={18} color="white" strokeWidth={1.5} />
        </div>
        {!isCollapsed && (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="sidebar-logo-text">IMMS</div>
            <div className="sidebar-logo-sub">Incident Management</div>
          </div>
        )}
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {filteredGroups.map((group) => (
          <div key={group.label}>
            <div className="sidebar-section">
              <span className="sidebar-section-label">{group.label}</span>
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={isCollapsed ? item.label : ''}
                onClick={mobileOpen ? onClose : undefined}
              >
                <item.icon size={20} strokeWidth={1.5} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Desktop collapse toggle */}
      {!mobileOpen && (
        <div className="sidebar-toggle-row">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} strokeWidth={1.5} /> : <ChevronLeft size={16} strokeWidth={1.5} />}
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Theme toggle + logout row */}
        <div className="sidebar-footer-actions">
          <button
            onClick={toggleTheme}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            style={{ flex: isCollapsed ? 1 : 'none' }}
          >
            {theme === 'dark' ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
          </button>
          {/* Logout button — separate from user info to prevent accidental logout */}
          {!isCollapsed && (
            <button
              onClick={handleLogout}
              className={`btn btn-icon btn-sm ${confirmLogout ? 'btn-danger' : 'btn-ghost'}`}
              aria-label={confirmLogout ? 'Confirm logout' : 'Logout'}
              title={confirmLogout ? 'Click again to confirm logout' : 'Logout'}
              style={{ marginLeft: 'auto', transition: 'all var(--t-base)' }}
            >
              {confirmLogout ? <Check size={14} /> : <LogOut size={14} />}
            </button>
          )}
        </div>
        {/* User info — purely informational, not a button */}
        <div className="user-badge" style={{ cursor: 'default' }}>
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role}</div>
          </div>
          {isCollapsed && (
            <button
              onClick={handleLogout}
              className={`btn btn-icon btn-sm ${confirmLogout ? 'btn-danger' : 'btn-ghost'}`}
              aria-label="Logout"
              title={confirmLogout ? 'Click again to confirm' : 'Logout'}
            >
              <LogOut size={12} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
