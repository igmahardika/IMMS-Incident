import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { ROLE_COLORS } from '../utils/constants.js';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

const QUICK_LOGINS = [
  { u: 'admin',   p: 'admin123',   role: 'Admin',    color: ROLE_COLORS.admin },
  { u: 'noc1',    p: 'noc123',     role: 'NOC',      color: ROLE_COLORS.noc },
  { u: 'tech1',   p: 'tech123',    role: 'Technician', color: ROLE_COLORS.technician },
  { u: 'manager', p: 'manager123', role: 'Manager',  color: ROLE_COLORS.manager },
];

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (err) {
      addToast(err.message || 'Login failed. Please check your username and password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-base-200">
      {/* Subtle bg orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,oklch(var(--p))_0%,transparent_70%)] opacity-5 top-[-10%] left-[-10%]" />
        <div className="absolute w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,oklch(var(--s))_0%,transparent_70%)] opacity-5 bottom-[-5%] right-[-5%]" />
      </div>

      <div className="w-full max-w-[400px] relative z-10">
        {/* Brand */}
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="w-14 h-14 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-primary-content" strokeWidth="3">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-base-content">IMMS</h1>
          <p className="text-xs font-semibold uppercase tracking-wider text-base-content/40 mt-2">
            Incident & Maintenance Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-base-100 shadow-2xl rounded-lg overflow-hidden">
          <div className="p-10">
            <h2 className="text-2xl font-bold tracking-tight text-base-content">Security Access</h2>
            <p className="text-xs font-semibold text-base-content/40 uppercase tracking-wider mb-8">
              Authenticate to access the monitoring core
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="form-control w-full">
                <div className="label pt-0"><span className="label-text text-xs font-semibold text-base-content/40 uppercase tracking-wider">Operator Identity</span></div>
                <div className="relative flex items-center">
                  <User size={16} className="absolute left-4 text-base-content/20 pointer-events-none" />
                  <input
                    id="login-username"
                    type="text"
                    className="input input-bordered w-full pl-12 font-semibold text-sm tracking-tight h-12 rounded-lg focus:bg-base-200/50 transition-all"
                    placeholder="Enter username"
                    value={form.username}
                    onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </label>

              <label className="form-control w-full">
                <div className="label pt-2"><span className="label-text text-xs font-semibold text-base-content/40 uppercase tracking-wider">Access Key</span></div>
                <div className="relative flex items-center">
                  <Lock size={16} className="absolute left-4 text-base-content/20 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPw ? 'text' : 'password'}
                    className="input input-bordered w-full pl-12 pr-12 font-semibold text-sm tracking-tight h-12 rounded-lg focus:bg-base-200/50 transition-all"
                    placeholder="Enter password"
                    value={form.password}
                    onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-4 text-base-content/20 hover:text-primary transition-all active:scale-90"
                    tabIndex={-1}
                    aria-label="Toggle password visibility"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <button type="submit" className="btn btn-primary w-full mt-6 h-12 font-semibold uppercase tracking-wider text-xs shadow-xl shadow-primary/20 rounded-lg" disabled={loading}>
                {loading ? <span className="loading loading-spinner loading-sm"></span> : 'Initialize Session'}
              </button>
            </form>
          </div>
        </div>

        {/* Quick login */}
        <div className="mt-8 bg-base-100 rounded-lg p-6 shadow-sm">
          <div className="text-xs font-medium text-base-content/20 uppercase tracking-wider mb-4 text-center">
            Development Quick Access
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LOGINS.map(({ u, p, role }) => (
              <button
                key={u}
                onClick={() => setForm({ username: u, password: p })}
                className="flex flex-col items-center justify-center p-4 bg-base-200 hover:bg-primary/5 rounded-lg transition-all text-center group active:scale-95"
              >
                <div className="text-xs font-semibold text-primary uppercase tracking-wider group-hover:scale-110 transition-transform">{role}</div>
                <div className="text-xs font-mono font-semibold text-base-content/30 mt-1 uppercase tracking-tighter">{u}</div>
              </button>
            ))}
          </div>
        </div>

        <p className="text-xs font-semibold text-center mt-6 text-base-content/40 uppercase tracking-wider">
          NCAL MONITORING FRAMEWORK © 2026<br />V 5.0.0 ENTERPRISE EDITION
        </p>
      </div>
    </div>
  );
}
