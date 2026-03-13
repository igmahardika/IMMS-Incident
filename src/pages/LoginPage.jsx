import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Zap, Eye, EyeOff, Lock, User } from 'lucide-react';

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
      addToast(err.message || 'Login gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      background: 'var(--bg-base)',
      backgroundImage: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.12) 0%, transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.08) 0%, transparent 50%)',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: '2rem' }}>
          <div style={{
            width: 64, height: 64,
            background: 'linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%)',
            borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 40px var(--accent-glow), 0 0 80px rgba(99,102,241,0.1)',
          }}>
            <Zap size={32} color="white" strokeWidth={2.5} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>IMMS</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Incident & Maintenance Management System</div>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>Masuk ke Akun Anda</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>Silakan login untuk melanjutkan</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Username</label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Masukkan username"
                  style={{ paddingLeft: '2rem' }}
                  value={form.username}
                  onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type={showPw ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Masukkan password"
                  style={{ paddingLeft: '2rem', paddingRight: '2.5rem' }}
                  value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? 'Memuat...' : 'Masuk'}
            </button>
          </form>
        </div>

        {/* Hint */}
        <div style={{ marginTop: '1.25rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem 1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600 }}>Default Credentials:</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px' }}>
            {[
              ['admin', 'admin123', 'Admin'],
              ['noc1', 'noc123', 'NOC'],
              ['tech1', 'tech123', 'Teknisi'],
              ['manager', 'manager123', 'Manager'],
            ].map(([u, p, role]) => (
              <button
                key={u}
                onClick={() => setForm({ username: u, password: p })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: 'var(--accent-hover)', fontSize: '0.7rem', padding: '2px 0', fontFamily: 'monospace' }}
              >
                {role}: <span style={{ color: 'var(--text-secondary)' }}>{u}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
