import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import CurrentTroublePage from './pages/CurrentTroublePage.jsx';
import CreateIncidentPage from './pages/CreateIncidentPage.jsx';
import IncidentDetailPage from './pages/IncidentDetailPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import MonthlyViewPage from './pages/MonthlyViewPage.jsx';
import DurationReportPage from './pages/DurationReportPage.jsx';
import RootCausePage from './pages/RootCausePage.jsx';
import { MasterCustomerPage, MasterClassificationPage, UserManagementPage, MasterTechnicalSupportPage, MasterDistribusiPage, MasterActionPage } from './pages/MasterDataPages.jsx';
import EscalationSettingsPage from './pages/EscalationSettingsPage.jsx';

// ─── Theme Context ────────────────────────────────────────────────────────────
export const ThemeContext = React.createContext({ theme: 'dark', toggle: () => {} });

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[IMMS] Uncaught error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--bg-base)', gap: 16, padding: '2rem'
        }}>
          <div style={{ fontSize: '2rem' }}>⚠</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Something went wrong</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: 420, textAlign: 'center' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </div>
          <button
            className="btn btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('imms_theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('imms_theme', theme);
  }, [theme]);

  const toggle = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), []);

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="spinner" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;

  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/incidents" element={<ProtectedRoute><CurrentTroublePage /></ProtectedRoute>} />
                <Route path="/incidents/create" element={<ProtectedRoute allowedRoles={['admin', 'noc']}><CreateIncidentPage /></ProtectedRoute>} />
                <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetailPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute allowedRoles={['admin', 'noc', 'manager']}><HistoryPage /></ProtectedRoute>} />
                <Route path="/history/monthly" element={<ProtectedRoute allowedRoles={['admin', 'noc', 'manager']}><MonthlyViewPage /></ProtectedRoute>} />
                <Route path="/analytics/duration" element={<ProtectedRoute allowedRoles={['admin', 'noc', 'manager']}><DurationReportPage /></ProtectedRoute>} />
                <Route path="/analytics/root-cause" element={<ProtectedRoute allowedRoles={['admin', 'noc', 'manager']}><RootCausePage /></ProtectedRoute>} />
                <Route path="/master/customers" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><MasterCustomerPage /></ProtectedRoute>} />
                <Route path="/master/classifications" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><MasterClassificationPage /></ProtectedRoute>} />
                <Route path="/master/technical-support" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><MasterTechnicalSupportPage /></ProtectedRoute>} />
                <Route path="/master/distribusi" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><MasterDistribusiPage /></ProtectedRoute>} />
                <Route path="/master/actions" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><MasterActionPage /></ProtectedRoute>} />
                <Route path="/master/users" element={<ProtectedRoute allowedRoles={['admin']}><UserManagementPage /></ProtectedRoute>} />
                <Route path="/settings/escalation" element={<ProtectedRoute allowedRoles={['admin']}><EscalationSettingsPage /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
