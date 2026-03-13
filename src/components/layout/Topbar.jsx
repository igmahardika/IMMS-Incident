import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Shield } from 'lucide-react';

const TITLES = {
  '/': 'Dashboard',
  '/incidents': 'Current Trouble',
  '/incidents/create': 'Create Incident',
  '/history': 'Done Incidents',
  '/history/monthly': 'Monthly View',
  '/analytics/duration': 'Duration Report',
  '/analytics/root-cause': 'Root Cause Analysis',
  '/master/sites': 'Master Site',
  '/master/classifications': 'Master Klasifikasi',
  '/master/users': 'User Management',
  '/settings/escalation': 'Escalation Settings',
};

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(t); }, []);
  return (
    <span className="topbar-time">
      {time.toLocaleString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
    </span>
  );
}

export default function Topbar() {
  const { user } = useAuth();
  const location = useLocation();
  const title = TITLES[location.pathname] || 'IMMS';
  const parts = location.pathname.split('/').filter(Boolean);

  return (
    <header className="topbar">
      <div className="breadcrumb">
        <span>IMMS</span>
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            <span style={{ opacity: 0.35 }}>›</span>
            {i === parts.length - 1
              ? <span className="breadcrumb-current">{TITLES[location.pathname] || p}</span>
              : <span style={{ textTransform: 'capitalize' }}>{p}</span>
            }
          </React.Fragment>
        ))}
        {parts.length === 0 && <span className="breadcrumb-current">Dashboard</span>}
      </div>
      <div className="topbar-right">
        <LiveClock />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.3rem 0.65rem' }}>
          <Shield size={12} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{user?.role?.toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}
