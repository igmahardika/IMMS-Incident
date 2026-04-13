import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';
import { Eye, EyeOff, Sparkles, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Input, SectionCard } from '../components/ui/index.jsx';

const FLOATING_NODES = [
  { top: '12%', left: '16%', delay: 0 },
  { top: '24%', left: '74%', delay: 0.8 },
  { top: '58%', left: '22%', delay: 1.3 },
  { top: '70%', left: '82%', delay: 0.4 },
  { top: '42%', left: '56%', delay: 1.1 },
];

const MotionDiv = motion.div;

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const heroRef = useRef(null);

  const pointerX = useMotionValue(320);
  const pointerY = useMotionValue(320);
  const smoothX = useSpring(pointerX, { stiffness: 120, damping: 22, mass: 0.35 });
  const smoothY = useSpring(pointerY, { stiffness: 120, damping: 22, mass: 0.35 });

  const spotlight = useMotionTemplate`radial-gradient(600px circle at ${smoothX}px ${smoothY}px, hsl(var(--primary) / 0.28), transparent 42%)`;
  const accentGlow = useMotionTemplate`radial-gradient(440px circle at ${smoothX}px ${smoothY}px, hsl(var(--chart-2) / 0.24), transparent 34%)`;
  const tertiaryGlow = useMotionTemplate`radial-gradient(320px circle at ${smoothX}px ${smoothY}px, hsl(var(--chart-3) / 0.22), transparent 30%)`;

  const handleHeroPointerMove = (event) => {
    const bounds = heroRef.current?.getBoundingClientRect();
    if (!bounds) return;
    pointerX.set(event.clientX - bounds.left);
    pointerY.set(event.clientY - bounds.top);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      await login(form.username, form.password);
      navigate('/');
    } catch (error) {
      addToast(error.message || 'Login failed. Please check your username and password.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div className="relative z-10 grid min-h-dvh lg:grid-cols-[minmax(0,1.15fr)_480px]">
        <div
          ref={heroRef}
          onPointerMove={handleHeroPointerMove}
          className="relative hidden overflow-hidden border-r border-border/60 bg-[linear-gradient(145deg,hsl(var(--background)),hsl(var(--chart-2)/0.1)_34%,hsl(var(--primary)/0.08)_64%,hsl(var(--chart-3)/0.14))] lg:block"
        >
          <MotionDiv className="pointer-events-none absolute inset-0 opacity-100 mix-blend-screen" style={{ background: spotlight }} />
          <MotionDiv className="pointer-events-none absolute inset-0 opacity-90 mix-blend-screen" style={{ background: accentGlow }} />
          <MotionDiv className="pointer-events-none absolute inset-0 opacity-80 mix-blend-screen" style={{ background: tertiaryGlow }} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_24%),radial-gradient(circle_at_82%_18%,hsl(var(--chart-2)/0.16),transparent_22%),radial-gradient(circle_at_24%_85%,hsl(var(--chart-3)/0.16),transparent_24%)]" />
          <MotionDiv
            className="pointer-events-none absolute z-[1] h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)/0.24),hsl(var(--chart-2)/0.2),hsl(var(--chart-3)/0.18))] blur-[120px]"
            style={{ left: smoothX, top: smoothY }}
          />
          <MotionDiv
            className="pointer-events-none absolute z-[1] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.18),hsl(var(--chart-2)/0.14),transparent_72%)] blur-2xl"
            style={{ left: smoothX, top: smoothY }}
          />

          {FLOATING_NODES.map((node, index) => (
            <MotionDiv
              key={`${node.top}-${node.left}`}
              className="pointer-events-none absolute"
              style={{ top: node.top, left: node.left }}
              animate={{ y: [0, -14, 0], opacity: [0.16, 0.38, 0.16], scale: [1, 1.08, 1] }}
              transition={{ duration: 6.5 + index, delay: node.delay, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="h-3 w-3 rounded-full bg-primary/25 ring-1 ring-primary/18 shadow-[0_0_28px_hsl(var(--primary)/0.28)]" />
            </MotionDiv>
          ))}

          <div className="relative flex h-full flex-col justify-center p-12">
            <div className="space-y-10">
              <MotionDiv
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="inline-flex items-center gap-4 rounded-2xl border border-border/80 bg-background/60 px-4 py-3 shadow-lg backdrop-blur-xl"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold tracking-tight text-foreground">IMMS</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Enterprise NOC Console
                  </p>
                </div>
              </MotionDiv>

              <MotionDiv
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.08, ease: 'easeOut' }}
                className="max-w-xl space-y-6"
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  <Sparkles className="h-4 w-4" />
                  Incident Management Platform
                </div>

                <h1 className="text-5xl font-semibold leading-tight tracking-tight text-foreground">
                  Premium command center for monitoring, handling, and continuity.
                </h1>

                <p className="max-w-lg text-base leading-7 text-muted-foreground">
                  Track live incidents, preserve readable handling history, and keep every
                  operational decision consistent across shifts.
                </p>
              </MotionDiv>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center bg-background px-6 py-10 sm:px-8 lg:px-12">
          <MotionDiv
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="w-full max-w-md"
          >
            <SectionCard className="border-border/80 bg-background/82 shadow-2xl backdrop-blur-2xl" padding={false}>
              <div className="space-y-6 p-7">
                <div className="space-y-2 text-center lg:text-left">
                  <p className="text-sm font-medium uppercase tracking-[0.18em] text-primary">
                    Secure Sign In
                  </p>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                    Access IMMS workspace
                  </h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Sign in with your account to continue into the operations console.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input
                    id="login-username"
                    label="Username"
                    value={form.username}
                    onChange={(event) => setForm((previous) => ({ ...previous, username: event.target.value }))}
                    placeholder="Enter username"
                    autoComplete="username"
                    autoFocus
                    required
                  />

                  <div className="grid gap-2">
                    <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                      Password
                    </label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        value={form.password}
                        onChange={(event) => setForm((previous) => ({ ...previous, password: event.target.value }))}
                        placeholder="Enter password"
                        autoComplete="current-password"
                        required
                        className="pr-11"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((previous) => !previous)}
                        className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" size="lg" isLoading={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </div>
            </SectionCard>
          </MotionDiv>
        </div>
      </div>
    </div>
  );
}
