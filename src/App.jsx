import React from 'react';
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
import { MasterCustomerPage, MasterClassificationPage, UserManagementPage, MasterTechnicalSupportPage, MasterDistribusiPage } from './pages/MasterDataPages.jsx';
import EscalationSettingsPage from './pages/EscalationSettingsPage.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/incidents" element={<ProtectedRoute><CurrentTroublePage /></ProtectedRoute>} />
            <Route path="/incidents/create" element={<ProtectedRoute><CreateIncidentPage /></ProtectedRoute>} />
            <Route path="/incidents/:id" element={<ProtectedRoute><IncidentDetailPage /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
            <Route path="/history/monthly" element={<ProtectedRoute><MonthlyViewPage /></ProtectedRoute>} />
            <Route path="/analytics/duration" element={<ProtectedRoute><DurationReportPage /></ProtectedRoute>} />
            <Route path="/analytics/root-cause" element={<ProtectedRoute><RootCausePage /></ProtectedRoute>} />
            <Route path="/master/customers" element={<ProtectedRoute><MasterCustomerPage /></ProtectedRoute>} />
            <Route path="/master/classifications" element={<ProtectedRoute><MasterClassificationPage /></ProtectedRoute>} />
            <Route path="/master/technical-support" element={<ProtectedRoute><MasterTechnicalSupportPage /></ProtectedRoute>} />
            <Route path="/master/distribusi" element={<ProtectedRoute><MasterDistribusiPage /></ProtectedRoute>} />
            <Route path="/master/users" element={<ProtectedRoute><UserManagementPage /></ProtectedRoute>} />
            <Route path="/settings/escalation" element={<ProtectedRoute><EscalationSettingsPage /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
