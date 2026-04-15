import React from 'react';

export function PreviewItem({ label, value, icon: Icon }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </p>
          <p className="text-sm font-medium text-foreground">
            {value || '—'}
          </p>
        </div>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </div>
    </div>
  );
}
