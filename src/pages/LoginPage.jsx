import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { Button } from '../components/ui/index.jsx';

const QUICK_LOGINS = [
  { u: 'admin',   p: 'admin123',   role: 'Admin' },
  { u: 'noc1',    p: 'noc123',     role: 'NOC' },
  { u: 'tech1',   p: 'tech123',    role: 'Technician' },
  { u: 'manager', p: 'manager123', role: 'Manager' },
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
    <div className="min-h-dvh flex items-center justify-center p-4 font-sans relative overflow-hidden bg-[#0A0A0A]">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PScwIDAgMjAwIDIwMCcgeG1sbnM9J2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJz48ZmlsdGVyIGlkPSdub2lzZUZpbHRlcic+PGZlVHVyYnVsZW5jZSB0eXBlPSdmcmFjdGFsTm9pc2UnIGJhc2VGcmVxdWVuY3k9JzAuNjUnIG51bU9jdGF2ZXM9JzMnIHN0aXRjaFRpbGVzPSdzdGl0Y2gnLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0nMTAwJScgaGVpZ2h0PScxMDAlJyBmaWx0ZXI9J3VybCgjbm9pc2VGaWx0ZXIpJy8+PC9zdmc+')] opacity-[0.03] brightness-100 contrast-150" />
      </div>

      <div className="w-full max-w-[400px] relative z-10 flex flex-col gap-10">
        {/* Enterprise Brand Identity */}
        <div className="flex flex-col items-center text-center">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl group-hover:bg-primary/40 transition-all duration-700 rounded-full scale-150" />
            <div className="relative w-16 h-16 bg-gradient-to-tr from-primary to-primary/60 rounded-2xl flex items-center justify-center shadow-2xl shadow-primary/20 border border-white/10 ring-1 ring-primary/50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white drop-shadow-sm" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
              </svg>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center gap-1.5">
             <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic leading-none">IMMS<span className="text-primary not-italic">.</span></h1>
             <div className="h-px w-8 bg-primary/30" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-foreground/40 leading-none">Management Core System</p>
          </div>
        </div>

        {/* Security Access Module */}
        <div className="relative group p-[1px] rounded-2xl overflow-hidden bg-gradient-to-br from-white/10 to-transparent shadow-2xl shadow-black/50">
          <div className="relative bg-[#0A0A0A]/95 backdrop-blur-3xl rounded-[15px] overflow-hidden flex flex-col">
            <div className="p-8 flex flex-col gap-8">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-black tracking-tight text-white/90 uppercase italic">Security Protocol</h2>
                <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-[0.2em] leading-none">
                  Encrypted session initialization required
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-left">
                <div className="flex flex-col gap-2">
                  <label htmlFor="login-username" className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Operator Identifier</label>
                  <div className="relative group/input flex items-center">
                    <User size={14} className="absolute left-4 text-foreground/20 group-focus-within/input:text-primary transition-colors duration-300" />
                    <input
                      id="login-username"
                      type="text"
                      className="h-11 w-full bg-foreground/[0.03] border border-foreground/5 rounded-xl pl-11 pr-4 text-[13px] font-bold text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-primary/40 focus:bg-primary/[0.02] focus:ring-4 focus:ring-primary/5"
                      placeholder="Username"
                      value={form.username}
                      onChange={(e) => setForm(p => ({ ...p, username: e.target.value }))}
                      required
                      autoFocus
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="login-password" className="text-[9px] font-black text-foreground/40 uppercase tracking-[0.2em] ml-1">Access Directive</label>
                  <div className="relative group/input flex items-center">
                    <Lock size={14} className="absolute left-4 text-foreground/20 group-focus-within/input:text-primary transition-colors duration-300" />
                    <input
                      id="login-password"
                      type={showPw ? 'text' : 'password'}
                      className="h-11 w-full bg-foreground/[0.03] border border-foreground/5 rounded-xl pl-11 pr-12 text-[13px] font-bold text-white placeholder:text-white/30 transition-all duration-300 focus:outline-none focus:border-primary/40 focus:bg-primary/[0.02] focus:ring-4 focus:ring-primary/5"
                      placeholder="Password"
                      value={form.password}
                      onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(v => !v)}
                      className="absolute right-4 text-foreground/20 hover:text-white transition-all active:scale-90"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  className="mt-4 h-12 text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 relative overflow-hidden group/btn"
                  isLoading={loading}
                >
                  <span className="relative z-10">{loading ? 'AUTHENTICATING...' : 'INITIALIZE SYSTEM'}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary via-white/20 to-primary translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 opacity-30" />
                </Button>
              </form>
            </div>
            
            {/* Ambient indicator */}
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
          </div>
        </div>

        {/* Temporal Quick Access */}
        <div className="bg-[#0A0A0A]/40 backdrop-blur-md rounded-2xl p-6 border border-white/[0.03]">
          <div className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.3em] mb-5 text-center leading-none">
             Development Sandbox Credentials
          </div>
          <div className="grid grid-cols-2 gap-3">
            {QUICK_LOGINS.map(({ u, p, role }) => (
              <button
                key={u}
                onClick={() => setForm({ username: u, password: p })}
                className="flex flex-col items-center justify-center py-3 px-2 bg-white/[0.02] hover:bg-primary/[0.08] hover:border-primary/20 rounded-xl border border-white/[0.02] transition-all duration-300 group relative overflow-hidden active:scale-95"
              >
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="text-[10px] font-black text-primary/70 uppercase tracking-widest leading-none mb-1.5 group-hover:text-primary transition-colors">{role}</div>
                <div className="text-[9px] font-mono font-bold text-foreground/20 uppercase tracking-tighter group-hover:text-foreground/40 transition-colors uppercase">{u}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 opacity-30 group">
          <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground leading-none">
            NCAL MONITORING FRAMEWORK <span className="text-primary italic">CORE</span>
          </p>
          <div className="h-px w-32 bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground/60 leading-none">
            V 5.0.0 ENTERPRISE EDITION • SECURE CHANNEL ADAPTER
          </p>
        </div>
      </div>
    </div>
  );
}
