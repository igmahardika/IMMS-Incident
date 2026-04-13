import React, { useEffect } from 'react';
import { getNcalBadgeClass } from '../../../utils/themeMap.js';
import { cn } from '../../../lib/utils.js';

export function NcalBadge({ value }) {
  const styles = getNcalBadgeClass(value);
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] h-5 px-2 rounded font-bold uppercase tracking-widest leading-none",
      styles.bg, styles.text
    )} aria-label={`NCAL ${value}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current shrink-0 mr-1.5 opacity-80" />
      {value}
    </span>
  );
}

export function StatusPill({ status }) {
  const labels = { open: 'OPEN', progress: 'IN PROGRESS', pending: 'PAUSED', done: 'DONE' };
  const badgeMap = { 
    open: 'bg-info/10 text-info', 
    progress: 'bg-success/10 text-success', 
    pending: 'bg-warning/10 text-warning', 
    done: 'bg-foreground/10 text-foreground/60' 
  };
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] h-5 px-2 rounded font-bold uppercase tracking-widest leading-none",
      badgeMap[status] || 'bg-foreground/10 text-foreground/60'
    )}>
      {labels[status] || status}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className="inline-flex items-center text-[10px] h-5 px-2 rounded bg-foreground/10 text-foreground/70 font-bold uppercase tracking-widest leading-none">
      {role}
    </span>
  );
}

export function GradeBadge({ grade }) {
  const colorMap = { 
    VIP: 'bg-primary/10 text-primary', 
    Gold: 'bg-warning/10 text-warning', 
    Silver: 'bg-foreground/10 text-foreground/70', 
    Bronze: 'bg-foreground/5 text-foreground/60' 
  };
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] h-5 px-2 rounded font-bold tracking-widest leading-none",
      colorMap[grade] || 'bg-foreground/5 text-foreground/60'
    )}>
      {grade}
    </span>
  );
}

export function StatusBadge({ active }) {
  return (
    <span className={cn(
      "inline-flex items-center justify-center text-[10px] h-5 px-2 rounded font-bold uppercase tracking-widest leading-none gap-1",
      active ? 'bg-success/10 text-success' : 'bg-foreground/5 text-foreground/50'
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", active ? "bg-success" : "bg-foreground/30")} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

export function AccentBadge({ text }) {
  return (
    <span className="inline-flex items-center justify-center text-[10px] h-5 px-2 rounded bg-primary/10 text-primary font-bold uppercase tracking-widest leading-none">
      {text}
    </span>
  );
}

export function DurationBadge({ seconds, target }) {
  if (seconds == null) return <span className="text-muted-foreground">—</span>;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const isExceeded = target && seconds > target;
  return (
    <span className={cn(
      "font-mono text-[11px] tabular-nums font-bold inline-flex items-center gap-1",
      isExceeded ? 'text-error' : 'text-foreground/70'
    )}>
      {isExceeded && <span className="inline-block w-1.5 h-1.5 rounded-full bg-error animate-pulse" />}
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  );
}

export function LiveTimer({ startIso, pausedSec = 0, paused = false, target }) {
  const [elapsed, setElapsed] = React.useState(0);

  useEffect(() => {
    if (!startIso) return;
    const calc = () => {
      const base = Math.floor((Date.now() - new Date(startIso).getTime()) / 1000) - pausedSec;
      setElapsed(Math.max(0, base));
    };
    calc();
    if (paused) return;
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [startIso, pausedSec, paused]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const isWarning = elapsed > 7200 && elapsed <= 14400; // 2-4 hours
  const isUrgent = elapsed > 14400; // >4 hours
  const isExceeded = target && elapsed > target;
  
  const statusClasses = {
    success: 'text-success/90',
    warning: 'text-warning',
    danger:  'text-error animate-pulse',
    paused:  'text-foreground/40'
  };

  const state = paused ? 'paused' : (isExceeded || isUrgent) ? 'danger' : isWarning ? 'warning' : 'success';

  return (
    <span className={cn(
      "font-mono tabular-nums text-[11px] font-bold inline-flex items-center gap-1.5",
      statusClasses[state]
    )}>
      <span className={cn(
        "inline-block w-1.5 h-1.5 rounded-full shrink-0",
        state === 'success' && 'bg-success/80',
        state === 'warning' && 'bg-warning',
        state === 'danger' && 'bg-error shadow-[0_0_8px_rgba(var(--color-error),0.5)]',
        state === 'paused' && 'bg-foreground/30'
      )} />
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
      {paused && <span className="text-[9px] font-black tracking-widest opacity-60 ml-0.5 uppercase">PAUSED</span>}
    </span>
  );
}

export function LevelBadge({ level, targetHours }) {
  const isExceeded = targetHours != null && level > targetHours;
  const isSafe = targetHours != null && level <= targetHours;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded w-12 justify-center leading-none tracking-tight",
        isExceeded ? 'bg-error/10 text-error'
        : isSafe ? 'bg-success/10 text-success'
        : 'bg-foreground/5 text-foreground/50'
      )}
    >
      <span className={cn(
        "inline-block w-1 h-1 rounded-sm shrink-0",
        isExceeded ? 'bg-error' : isSafe ? 'bg-success' : 'bg-foreground/30'
      )} />
      L{level || 1}
    </span>
  );
}
