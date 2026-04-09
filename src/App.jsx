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
import { AlertTriangle, Loader2 } from 'lucide-react';

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
        <div className="min-h-dvh bg-background flex flex-col items-center justify-center p-8 text-center gap-6">
          <div className="w-16 h-16 rounded-3xl bg-error/10 flex items-center justify-center text-error animate-bounce">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">System Exception Detected</h1>
            <p className="text-sm font-medium text-foreground/50 max-w-md leading-relaxed mx-auto">
              {this.state.error?.message || 'An unexpected error occurred in the IMMS runtime environment.'}
            </p>
          </div>
          <div className="flex gap-4">
            <button
              className="px-8 py-2 rounded-md bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors shadow-sm"
              onClick={() => { window.location.reload(); }}
            >
              Reload Interface
            </button>
            <button
              className="px-6 py-2 rounded-md bg-transparent text-foreground/70 font-bold hover:bg-foreground/5 transition-colors"
              onClick={() => { this.setState({ hasError: false, error: null }); }}
            >
              Reset Session
            </button>
          </div>
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
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <Loader2 className="animate-spin text-primary w-8 h-8" />
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
                <Route path="/incidents/edit/:id" element={<ProtectedRoute allowedRoles={['admin', 'noc']}><CreateIncidentPage /></ProtectedRoute>} />
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
