import React, { useEffect, useState, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import { AlertTriangle, Loader2 } from 'lucide-react';

const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const DashboardPage = lazy(() => import('./pages/DashboardPage.jsx'));
const CurrentTroublePage = lazy(() => import('./pages/CurrentTroublePage.jsx'));
const CreateIncidentPage = lazy(() => import('./pages/CreateIncidentPage.jsx'));
const IncidentDetailPage = lazy(() => import('./pages/IncidentDetailPage.jsx'));
const HistoryPage = lazy(() => import('./pages/HistoryPage.jsx'));
const MonthlyViewPage = lazy(() => import('./pages/MonthlyViewPage.jsx'));
const DurationReportPage = lazy(() => import('./pages/DurationReportPage.jsx'));
const RootCausePage = lazy(() => import('./pages/RootCausePage.jsx'));

// Master Pages
const MasterCustomerPage = lazy(() => import('./pages/master/CustomersPage.jsx'));
const MasterClassificationPage = lazy(() => import('./pages/master/ClassificationsPage.jsx'));
const MasterTechnicalSupportPage = lazy(() => import('./pages/master/TechnicalSupportPage.jsx'));
const MasterDistribusiPage = lazy(() => import('./pages/master/DistribusiPage.jsx'));
const MasterActionPage = lazy(() => import('./pages/master/ActionsPage.jsx'));
const UserManagementPage = lazy(() => import('./pages/master/UsersPage.jsx'));
const EscalationSettingsPage = lazy(() => import('./pages/EscalationSettingsPage.jsx'));

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
    document.documentElement.classList.toggle('dark', theme === 'dark');
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true, // Auto refetch when user switches tabs and comes back
      staleTime: 1000 * 30, // Data considered fresh for 30s
    },
  },
});

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <Suspense fallback={
                  <div className="min-h-dvh flex items-center justify-center bg-background">
                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                  </div>
                }>
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
                </Suspense>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
          <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
        </QueryClientProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
