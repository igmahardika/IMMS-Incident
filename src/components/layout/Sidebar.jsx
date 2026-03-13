import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  LayoutDashboard, AlertTriangle, PlusCircle, History, BarChart2,
  TrendingUp, Database, Tag, Users, Settings, ChevronLeft, ChevronRight,
  Power, ListChecks, Zap, Network
} from 'lucide-react';

const menuGroups = [
  {
    label: 'Monitoring',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'manager', 'noc', 'technician'] },
    ]
  },
  {
    label: 'Task & Incident',
    items: [
      { to: '/incidents', icon: AlertTriangle, label: 'Current Trouble', roles: ['admin', 'manager', 'noc', 'technician'] },
      { to: '/incidents/create', icon: PlusCircle, label: 'Create Incident', roles: ['admin', 'noc'] },
    ]
  },
  {
    label: 'History & Archive',
    items: [
      { to: '/history', icon: History, label: 'Done Incidents', roles: ['admin', 'manager', 'noc'] },
      { to: '/history/monthly', icon: ListChecks, label: 'Monthly View', roles: ['admin', 'manager', 'noc'] },
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
      { to: '/master/customers', icon: Database, label: 'Master Customer', roles: ['admin', 'manager'] },
      { to: '/master/classifications', icon: Tag, label: 'Klasifikasi', roles: ['admin', 'manager'] },
      { to: '/master/technical-support', icon: Users, label: 'Personel Data', roles: ['admin', 'manager'] },
      { to: '/master/distribusi', icon: Network, label: 'Distribusi Tree', roles: ['admin', 'manager'] },
      { to: '/master/users', icon: Users, label: 'User Management', roles: ['admin'] },
    ]
  },
  {
    label: 'Settings',
    items: [
      { to: '/settings/escalation', icon: Settings, label: 'Escalation', roles: ['admin'] },
    ]
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  // Filter menu based on roles
  const filteredGroups = menuGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => !item.roles || item.roles.includes(user?.role))
    }))
    .filter(group => group.items.length > 0);

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={20} color="white" strokeWidth={2.5} />
        </div>
        {!collapsed && (
          <div>
            <div className="sidebar-logo-text">IMMS</div>
            <div className="sidebar-logo-sub">Incident Management</div>
          </div>
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
                title={collapsed ? item.label : ''}
              >
                <item.icon size={16} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div style={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', padding: '0 0.5rem 0.25rem' }}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="btn btn-ghost btn-icon btn-sm"
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="user-badge" onClick={handleLogout} title="Logout">
          <div className="user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name}</div>
            <div className="user-role">{user?.role} · Logout</div>
          </div>
          {!collapsed && <Power size={13} style={{ opacity: 0.4, flexShrink: 0 }} />}
        </div>
      </div>
    </aside>
  );
}
