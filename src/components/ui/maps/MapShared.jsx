import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { cn } from '../../../lib/utils.js';

export function ChangeView({ center, zoom, viewId }) {
  const map = useMap();
  const lastId = useRef(viewId);

  useEffect(() => {
    if (viewId && viewId !== lastId.current) {
      map.setView(center, zoom, { animate: true, duration: 1 });
      lastId.current = viewId;
      return;
    }

    if (!viewId) {
      map.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center, zoom, viewId, map]);

  return null;
}

export function SegmentedButton({ active, children, onClick, tone = 'default' }) {
  const activeClassName = {
    default: 'bg-primary text-primary-foreground shadow-sm',
    destructive: 'bg-destructive text-destructive-foreground shadow-sm',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors',
        active
          ? activeClassName[tone] || activeClassName.default
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {children}
    </button>
  );
}

export function LegendItem({ className, colorClassName, label }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('h-3 w-3 rounded-full ring-4', className || colorClassName)} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

export function StatChip({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-background/90 px-3 py-2 shadow-sm backdrop-blur">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

export function ReportReasonList({ title, items = [] }) {
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
