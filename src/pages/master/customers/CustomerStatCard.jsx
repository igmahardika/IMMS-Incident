import React from 'react';
import { cn } from '../../../lib/utils.js';

const toneClassName = {
  default: 'text-primary',
  warning: 'text-warning',
  success: 'text-success',
  info: 'text-info',
};

export function CustomerStatCard({ label, value, meta, icon, tone = 'default' }) {
  const Icon = icon;

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {label}
          </p>
          <p className="text-xl font-semibold tracking-tight text-foreground">
            {value}
          </p>
          {meta ? (
            <p className="text-[11px] text-muted-foreground">
              {meta}
            </p>
          ) : null}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Icon className={cn('h-4.5 w-4.5', toneClassName[tone] || toneClassName.default)} />
        </div>
      </div>
    </div>
  );
}
